import { truncateForX } from "@/lib/post-text";
import type { TargetPlatform } from "@/lib/types";

export type BufferResult = {
  success: boolean;
  postId: string | null;
  raw: unknown;
  errorMessage: string | null;
  /** Text actually sent to Buffer (e.g. X after length normalization). */
  sentText: string | null;
};

const URL = "https://api.buffer.com";

const CREATE_MUTATION = `
mutation CreatePost($input: CreatePostInput!) {
  createPost(input: $input) {
    ... on PostActionSuccess {
      post {
        id
        text
      }
    }
    ... on MutationError {
      message
    }
  }
}
`;

const DELETE_MUTATION = `
mutation DeletePost($input: DeletePostInput!) {
  deletePost(input: $input) {
    ... on DeletePostSuccess {
      id
    }
    ... on VoidMutationError {
      message
    }
  }
}
`;

function channelId(platform: TargetPlatform): string | undefined {
  const m: Record<TargetPlatform, string | undefined> = {
    linkedin: process.env.BUFFER_LINKEDIN_PROFILE_ID?.trim(),
    instagram: process.env.BUFFER_INSTAGRAM_PROFILE_ID?.trim(),
    x: process.env.BUFFER_X_PROFILE_ID?.trim(),
  };
  return m[platform];
}

type Gql = {
  errors?: { message?: string }[];
  data?: {
    createPost?: {
      post?: { id?: string };
      message?: string;
    };
  };
};

export async function queueBufferPost(
  platform: TargetPlatform,
  text: string,
  imageUrl?: string | null,
  shareNow = false,
): Promise<BufferResult> {
  const token = process.env.BUFFER_ACCESS_TOKEN?.trim();
  if (!token) {
    return {
      success: false,
      postId: null,
      raw: null,
      errorMessage: "BUFFER_ACCESS_TOKEN is not configured",
      sentText: null,
    };
  }

  const cid = channelId(platform);
  if (!cid) {
    return {
      success: false,
      postId: null,
      raw: null,
      errorMessage: `Missing env channel id for ${platform}`,
      sentText: null,
    };
  }

  const bodyText = platform === "x" ? truncateForX(text) : text;

  if (platform === "instagram" && !String(imageUrl ?? "").trim()) {
    return {
      success: false,
      postId: null,
      raw: null,
      errorMessage:
        "Instagram posts require a generated image — run image generation on this draft first.",
      sentText: null,
    };
  }

  if (platform === "instagram" && imageUrl) {
    try {
      const head = await fetch(imageUrl, {
        method: "HEAD",
        redirect: "follow",
        cache: "no-store",
      });
      let reachable = head.ok;
      let statusNote = head.status;
      if (!reachable) {
        const get = await fetch(imageUrl, {
          headers: { Range: "bytes=0-0" },
          redirect: "follow",
          cache: "no-store",
        });
        reachable = get.ok || get.status === 206;
        statusNote = get.status;
      }
      if (!reachable) {
        return {
          success: false,
          postId: null,
          raw: null,
          errorMessage: `Image URL not reachable (HTTP ${statusNote}) — Instagram cannot fetch it. Make the Supabase "post-images" bucket public or fix the URL.`,
          sentText: bodyText,
        };
      }
    } catch (e) {
      return {
        success: false,
        postId: null,
        raw: null,
        errorMessage:
          e instanceof Error
            ? `Image URL check failed: ${e.message}`
            : "Image URL check failed",
        sentText: bodyText,
      };
    }
  }

  // Instagram requires a post type and at least one image
  const metadata =
    platform === "instagram"
      ? { instagram: { type: "post", shouldShareToFeed: true } }
      : undefined;

  const assets =
    imageUrl
      ? { images: [{ url: imageUrl }] }
      : undefined;

  const input: Record<string, unknown> = {
    channelId: cid,
    text: bodyText,
    schedulingType: "automatic",
    mode: shareNow ? "shareNow" : "addToQueue",
    ...(metadata && { metadata }),
    ...(assets && { assets }),
  };

  let res: Response;
  try {
    res = await fetch(URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query: CREATE_MUTATION, variables: { input } }),
      cache: "no-store",
    });
  } catch (e) {
    return {
      success: false,
      postId: null,
      raw: null,
      errorMessage: e instanceof Error ? e.message : "Network error",
      sentText: bodyText,
    };
  }

  let raw: unknown;
  try {
    raw = await res.json();
  } catch {
    return {
      success: false,
      postId: null,
      raw: null,
      errorMessage: `Invalid JSON (HTTP ${res.status})`,
      sentText: bodyText,
    };
  }

  if (!res.ok) {
    return {
      success: false,
      postId: null,
      raw,
      errorMessage: `HTTP ${res.status}`,
      sentText: bodyText,
    };
  }

  const env = raw as Gql;
  if (env.errors?.length) {
    return {
      success: false,
      postId: null,
      raw,
      errorMessage: env.errors.map((e) => e.message ?? "GraphQL error").join("; "),
      sentText: bodyText,
    };
  }

  const node = env.data?.createPost;
  if (!node) {
    return {
      success: false,
      postId: null,
      raw,
      errorMessage: "Missing createPost",
      sentText: bodyText,
    };
  }

  if (node.post?.id) {
    return {
      success: true,
      postId: node.post.id,
      raw,
      errorMessage: null,
      sentText: bodyText,
    };
  }

  if (node.message) {
    return {
      success: false,
      postId: null,
      raw,
      errorMessage: String(node.message),
      sentText: bodyText,
    };
  }

  return {
    success: false,
    postId: null,
    raw,
    errorMessage: "Unexpected Buffer response",
    sentText: bodyText,
  };
}

/**
 * Deletes a post from Buffer by its post ID.
 * Silently succeeds if the post was already published or doesn't exist.
 */
export async function deleteBufferPost(
  bufferPostId: string,
): Promise<{ success: boolean; error?: string }> {
  const token = process.env.BUFFER_ACCESS_TOKEN?.trim();
  if (!token) return { success: false, error: "BUFFER_ACCESS_TOKEN not configured" };

  try {
    const res = await fetch(URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: DELETE_MUTATION,
        variables: { input: { id: bufferPostId } },
      }),
      cache: "no-store",
    });

    if (!res.ok) return { success: false, error: `HTTP ${res.status}` };

    const body = (await res.json()) as {
      errors?: { message?: string }[];
      data?: {
        deletePost?: { id?: string; message?: string };
      };
    };

    if (body.errors?.length) {
      return {
        success: false,
        error: body.errors.map((e) => e.message ?? "GraphQL error").join("; "),
      };
    }

    if (body.data?.deletePost?.message) {
      return { success: false, error: body.data.deletePost.message };
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Network error" };
  }
}

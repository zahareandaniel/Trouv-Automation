import type { TargetPlatform } from "@/lib/types";

export type BufferResult = {
  success: boolean;
  postId: string | null;
  raw: unknown;
  errorMessage: string | null;
};

const URL = "https://api.buffer.com";

const MUTATION = `
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
): Promise<BufferResult> {
  const token = process.env.BUFFER_ACCESS_TOKEN?.trim();
  if (!token) {
    return {
      success: false,
      postId: null,
      raw: null,
      errorMessage: "BUFFER_ACCESS_TOKEN is not configured",
    };
  }

  const cid = channelId(platform);
  if (!cid) {
    return {
      success: false,
      postId: null,
      raw: null,
      errorMessage: `Missing env channel id for ${platform}`,
    };
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
    text,
    schedulingType: "automatic",
    mode: "addToQueue",
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
      body: JSON.stringify({ query: MUTATION, variables: { input } }),
      cache: "no-store",
    });
  } catch (e) {
    return {
      success: false,
      postId: null,
      raw: null,
      errorMessage: e instanceof Error ? e.message : "Network error",
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
    };
  }

  if (!res.ok) {
    return {
      success: false,
      postId: null,
      raw,
      errorMessage: `HTTP ${res.status}`,
    };
  }

  const env = raw as Gql;
  if (env.errors?.length) {
    return {
      success: false,
      postId: null,
      raw,
      errorMessage: env.errors.map((e) => e.message ?? "GraphQL error").join("; "),
    };
  }

  const node = env.data?.createPost;
  if (!node) {
    return {
      success: false,
      postId: null,
      raw,
      errorMessage: "Missing createPost",
    };
  }

  if (node.post?.id) {
    return { success: true, postId: node.post.id, raw, errorMessage: null };
  }

  if (node.message) {
    return {
      success: false,
      postId: null,
      raw,
      errorMessage: String(node.message),
    };
  }

  return {
    success: false,
    postId: null,
    raw,
    errorMessage: "Unexpected Buffer response",
  };
}

type GitHubRepoResponse = {
  stargazers_count: number;
  [key: string]: unknown;
};

export async function getGitHubStars(): Promise<number> {
  try {
    const response = await fetch(
      'https://api.github.com/repos/weaviate/verba',
      {
        method: 'GET',
      }
    );

    if (!response.ok) {
      return 0;
    }

    const data: GitHubRepoResponse =
      (await response.json()) as GitHubRepoResponse;

    return data.stargazers_count || 0;
  } catch (_error) {
    return 0;
  }
}

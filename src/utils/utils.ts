import { GithubRepository } from "../types/github.types.js"



export function deriveResourceId(loadedResId: string, githubRepo: GithubRepository ): string {
  let loaded = loadedResId
  if (loaded === '') {
    loaded = githubRepo.owner + '-' + githubRepo.repo
  }
  return loaded
}
import * as github from '@actions/github'

export type GithubRepository = typeof github.context.repo
export type GithubPayload = typeof github.context.payload


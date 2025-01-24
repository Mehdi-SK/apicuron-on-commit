import * as core from '@actions/core'
import * as github from '@actions/github'

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const event = core.getInput('event')
    const eventJson = JSON.parse(event)
    const commits : any[] = eventJson.commits
    console.log('event\n', event)
    console.log('commits\n', commits)
    // const repository: string = core.getInput('sourceRepo')
    // const token = core.getInput('github_token', { required: true })
    // const apicuron_token = core.getInput('apicuron_token', { required: true })
    // const octokit = github.getOctokit(token)
    // const sha = github.context.sha
    // const { owner, repo } = github.context.repo
    // const data = await octokit.rest.repos.getCommit({
    //   owner,
    //   repo,
    //   ref: sha
    // })
    // add orcid
    // send to apicuron
    // console.log(JSON.stringify(data, null, 2))
    // console.log(`Commit Message: ${commit.commit.message}`)
    // console.log(`Author Name: ${commit.commit.author?.name}`)
    // console.log(`Author Email: ${commit.commit.author?.email}`)
    // console.log(`Committer Name: ${commit.commit.committer?.name}`)
    // console.log(`Committer Email: ${commit.commit.committer?.email}`)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

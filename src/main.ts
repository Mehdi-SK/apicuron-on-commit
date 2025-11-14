import * as core from '@actions/core'
import * as github from '@actions/github'
import { APICURONClient } from './apicuron-client/apicuron-client.js'
import { CommitProcessor } from './processors/commit.processor.js'
import { UserOrcidApiConfig } from './types/api-config.js'
import { RemoteApiProvider } from './orcid/orcid-providers/remote-api.provider.js'
import { deriveResourceId } from './utils/utils.js'
interface ReportApiConfig {
  endpoint: string
  token: string
}

export async function run(): Promise<void> {
  try {
    const userInfoConfig: UserOrcidApiConfig = {
      endpoint: core.getInput('USER_INFO_SERVICE_ENDPOINT', { required: true }),
      token: core.getInput('USER_INFO_SERVICE_TOKEN')
    }
    const apicuronEndpointConfig: ReportApiConfig = {
      endpoint: core.getInput('REPORT_API_ENDPOINT', { required: true }),
      token: core.getInput('REPORT_API_TOKEN')
    }
    const apicuronResourceId: string = deriveResourceId(
      core.getInput('RESOURCE_ID'),
      github.context.repo
    )
    const apicuronActivityName = core.getInput('ACTIVITY_NAME', {
      required: true
    })
    const apicuronLeague = core.getInput('LEAGUE') || 'default'
    const resourceUrl = core.getInput('RESOURCE_URL')

    const orcidProvider = new RemoteApiProvider(userInfoConfig)
    const commitProcessor = new CommitProcessor(orcidProvider)

    const githubPayload = github.context.payload

    const reports = await commitProcessor.process({
      githubPayload,
      apicuronResourceId,
      apicuronActivityName,
      apicuronLeague,
      resourceUrl
    })

    if (reports.length === 0) {
      core.info('No valid commits to process')
      return
    }
    core.info(`Generated ${reports.length} reports`)
    core.info(`sending reports to API: ${apicuronEndpointConfig.endpoint}`)
    console.log(JSON.stringify(reports, null, 2))

    const apicuronClient = new APICURONClient(apicuronEndpointConfig)
    await apicuronClient.sendReports(reports)
    core.setOutput('reports sent:', JSON.stringify(reports))
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}


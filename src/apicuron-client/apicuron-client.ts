// ...existing code...
import * as core from '@actions/core'

import { ReportApiConfig } from '../types/api-config.js'
import { Report } from '../types/report.schema.js'

export class APICURONClient {
  private endpoint: string
  private token: string

  constructor(config: ReportApiConfig) {
    this.endpoint = config.endpoint
    this.token = config.token
  }

  async sendReports(reports: Report[]): Promise<void> {
    try {
      core.info(`Sending ${reports.length} reports to ${this.endpoint}`)

      const requestBody = { reports }

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
          version: '2'
        },
        body: JSON.stringify(requestBody)
      })

      const contentType = response.headers.get('content-type') || ''
      const isJson = contentType.includes('application/json')
      const responseBody = isJson
        ? await response.json()
        : await response.text()

      if (!response.ok) {
        core.error(`API Error: ${response.status} ${response.statusText}`)
        core.error(`Response body: ${JSON.stringify(responseBody)}`)
        throw new Error(
          `API request failed: ${response.status} ${response.statusText}`
        )
      }

      core.info(`Successfully sent ${reports.length} reports`)
      core.debug(`API Response: ${JSON.stringify(responseBody)}`)
    } catch (error) {
      core.error('Failed to send reports')
      if (error instanceof Error) {
        core.error(error.stack || error.message)
      }
      throw error
    }
  }
}

# APICURON commit reporter

A GitHub Action that reports pushes to your repository to APICURON, associating them with user ORCIDs 

## Usage
### Setup

1. **Add Secrets to Repository**:
   - Go to Repository Settings → Secrets → Actions
   - Add these required secrets:
     - `REPORT_API_ENDPOINT`: APICURON report API URL
     - `REPORT_API_TOKEN`: APICURON API auth token
     - `USER_INFO_SERVICE_ENDPOINT`: ORCID lookup service URL
     - `USER_INFO_SERVICE_TOKEN`: ORCID service auth token
2. **Create Workflow File**:
   `.github/workflows/apicuron-report.yml`
   ```yaml
   name: APICURON Reporting
   on: [push]
   
   jobs:
     report:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
           
         - name: Submit to APICURON
           uses: ./.github/actions/apicuron-on-commit
           with:
             GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
             REPORT_API_ENDPOINT: ${{ secrets.REPORT_API_ENDPOINT }}
             REPORT_API_TOKEN: ${{ secrets.REPORT_API_TOKEN }}
             USER_INFO_SERVICE_ENDPOINT: ${{ secrets.USER_INFO_SERVICE_ENDPOINT }}
             USER_INFO_SERVICE_TOKEN: ${{ secrets.USER_INFO_SERVICE_TOKEN }}
             RESOURCE_ID: 'your-resource-id'  # e.g., repository ID
             ACTIVITY_NAME: 'commit'          # APICURON activity type
             LEAGUE: 'default'                # APICURON league
Change

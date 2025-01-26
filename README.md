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
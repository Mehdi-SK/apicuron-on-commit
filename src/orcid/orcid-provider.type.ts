export interface OrcidProvider {

    cache: Map<string, string>

    getUserOrcid(username: string): Promise<string>
}
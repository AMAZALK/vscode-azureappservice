/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { SiteConfigResource, SiteSourceControl } from 'azure-arm-website/lib/models';
import { BasicAuthenticationCredentials, ServiceClientCredentials } from 'ms-rest';
import { IDeploymentsClient, IFilesClient, IHostKeys } from 'vscode-azureappservice';
import { addExtensionUserAgent } from 'vscode-azureextensionui';
import KuduClient from 'vscode-azurekudu';
import { localize } from '../../localize';
import { requestUtils } from '../../utils/requestUtils';
import { ITrialAppMetadata } from './ITrialAppMetadata';

export class TrialAppClient implements IDeploymentsClient, IFilesClient {

    public isFunctionApp: boolean = false;
    public metadata: ITrialAppMetadata;

    private credentials: ServiceClientCredentials;

    public get fullName(): string {
        return this.metadata.hostName;
    }

    public get id(): string {
        return this.metadata.siteGuid;
    }

    public get kuduUrl(): string | undefined {
        return `https://${this.metadata.scmHostName}`;
    }

    public get defaultHostName(): string {
        return this.metadata.hostName;
    }

    public get defaultHostUrl(): string {
        return `https://${this.metadata.hostName}`;
    }

    private constructor(metadata: ITrialAppMetadata) {
        this.metadata = metadata;
        this.credentials = new BasicAuthenticationCredentials(metadata.publishingUserName, metadata.publishingPassword);
    }

    public static async createTrialAppClient(loginSession: string): Promise<TrialAppClient> {
        const metadata: ITrialAppMetadata = await this.getTrialAppMetaData(loginSession);
        return new TrialAppClient(metadata);
    }

    public static async getTrialAppMetaData(loginSession: string): Promise<ITrialAppMetadata> {
        const metadataRequest: requestUtils.Request = await requestUtils.getDefaultRequest('https://tryappservice.azure.com/api/vscoderesource', undefined, 'GET');

        metadataRequest.headers = {
            accept: "*/*",
            "accept-language": "en-US,en;q=0.9",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            cookie: `loginsession=${loginSession}`
        };

        const result: string = await requestUtils.sendRequest<string>(metadataRequest);
        return <ITrialAppMetadata>JSON.parse(result);
    }

    public async listHostKeys(): Promise<IHostKeys> {
        throw new Error('Method not implemented.');
    }

    public async getSiteConfig(): Promise<SiteConfigResource> {
        return {};
    }

    public async getSourceControl(): Promise<SiteSourceControl> {
        return {};
    }

    public async getKuduClient(): Promise<KuduClient> {
        if (!this.metadata.scmHostName) {
            throw new Error(localize('notSupportedLinux', 'This operation is not supported by this app service plan.'));
        }

        const kuduClient: KuduClient = new KuduClient(this.credentials, `https://${this.metadata.scmHostName}`);
        addExtensionUserAgent(kuduClient);
        return kuduClient;
    }
}

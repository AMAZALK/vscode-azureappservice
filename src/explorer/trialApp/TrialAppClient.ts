/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { StringDictionary } from 'azure-arm-website/lib/models';
import { BasicAuthenticationCredentials } from 'ms-rest';
import * as request from 'request';
import { IAppSettingsClient } from 'vscode-azureappservice/out/src/IAppSettingsClient';
import { addExtensionUserAgent } from 'vscode-azureextensionui';
import KuduClient from 'vscode-azurekudu';
import { localize } from '../../localize';
import { ITrialAppMetadata } from './ITrialAppMetadata';

export class TrialAppClient implements IAppSettingsClient {

    public get fullName(): string {
        return this.metadata.siteName;
    }
    public isLinux: boolean = true;

    public metadata: ITrialAppMetadata;

    private readonly _credentials: BasicAuthenticationCredentials;

    constructor(metadata: ITrialAppMetadata) {
        this.metadata = metadata;
        this._credentials = new BasicAuthenticationCredentials(metadata.publishingUserName, metadata.publishingPassword);
    }

    public async listApplicationSettings(): Promise<StringDictionary> {
        const kuduClient: KuduClient = await this.getKuduClient();
        const settings: StringDictionary = {};
        settings.properties = <{ [name: string]: string }>await kuduClient.settings.getAll();
        return settings;
    }
    public async updateApplicationSettings(appSettings: StringDictionary): Promise<StringDictionary> {

        const currentSettings: StringDictionary = await this.listApplicationSettings();

        // To handle renaming app settings, we need to delete the old setting.
        // tslint:disable-next-line:strict-boolean-expressions
        const properties: { [name: string]: string } = currentSettings.properties || {};
        await Promise.all(Object.keys(properties).map(async (key: string) => {
            if (appSettings.properties && appSettings.properties[key] === undefined) {
                await this.deleteApplicationSetting(appSettings, key);
            }
        }));

        const options: request.Options = {
            method: 'POST',
            url: `https://${this.metadata.scmHostName}/api/settings`,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(appSettings.properties)
        };

        options.auth = { username: this.metadata.publishingUserName, password: this.metadata.publishingPassword };

        request(options, (error: Error, _response: request.Response) => {
            if (error !== undefined) { throw error; }
        });

        return Promise.resolve(appSettings);
    }

    public async getKuduClient(): Promise<KuduClient> {
        if (!this.metadata.scmHostName) {
            throw new Error(localize('notSupportedLinux', 'This operation is not supported by this app service plan.'));
        }

        const kuduClient: KuduClient = new KuduClient(this._credentials, `https://${this.metadata.scmHostName}`);
        addExtensionUserAgent(kuduClient);
        return kuduClient;
    }

    public async deleteApplicationSetting(appSettings: StringDictionary, key: string): Promise<StringDictionary> {

        const options: request.Options = {
            method: 'DELETE',
            url: `https://${this.metadata.scmHostName}/api/settings/${key}`,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(appSettings.properties)
        };

        options.auth = { username: this.metadata.publishingUserName, password: this.metadata.publishingPassword };

        request(options, (error: Error, _response: request.Response) => {
            if (error !== undefined) { throw error; }
        });
        return Promise.resolve(appSettings);
    }
}

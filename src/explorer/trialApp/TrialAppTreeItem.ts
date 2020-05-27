/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AppSettingsTreeItem } from 'vscode-azureappservice';
import { AzExtTreeItem, IActionContext } from 'vscode-azureextensionui';
import { openUrl } from '../../utils/openUrl';
import { requestUtils } from '../../utils/requestUtils';
import { AzureAccountTreeItem } from '../AzureAccountTreeItem';
import { ISiteTreeItem } from '../ISiteTreeItem';
import { ITrialAppMetadata } from './ITrialAppMetadata';
import { TrialAppClient } from './TrialAppClient';
import { TrialAppTreeItemBase } from './TrialAppTreeItemBase';

export class TrialAppTreeItem extends TrialAppTreeItemBase implements ISiteTreeItem {

    public get timeLeft(): number {
        return this.metadata.timeLeft / 60;
    }
    public static contextValue: string = 'trialApp';
    public contextValue: string = TrialAppTreeItem.contextValue;

    public metadata: ITrialAppMetadata;

    public defaultHostName: string;

    public defaultHostUrl: string;

    private readonly _appSettingsTreeItem: AppSettingsTreeItem;

    private constructor(parent: AzureAccountTreeItem, metadata: ITrialAppMetadata) {
        super(parent, metadata.hostName);

        this.metadata = metadata;
        this.defaultHostName = this.metadata.hostName;
        this.defaultHostUrl = `https://${this.defaultHostName}`;

        this._appSettingsTreeItem = new AppSettingsTreeItem(parent, new TrialAppClient(metadata));
    }

    public static async createTrialAppTreeItem(parent: AzureAccountTreeItem, loginSession: string): Promise<TrialAppTreeItem> {
        const metadata: ITrialAppMetadata = await this.getTrialAppMetaData(loginSession);
        if (metadata.siteName) {
            return new TrialAppTreeItem(parent, metadata);
        } else {
            return Promise.reject('Could not get trial app metadata');
        }
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

        try {
            const result: string = await requestUtils.sendRequest<string>(metadataRequest);
            return <ITrialAppMetadata>JSON.parse(result);
        } catch (error) {
            throw error;
        }
    }

    public loadMoreChildrenImpl(_clearCache: boolean, _context: IActionContext): Promise<AzExtTreeItem[]> {
        return Promise.resolve([this._appSettingsTreeItem]);
    }
    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    public async browse(): Promise<void> {
        await openUrl(this.defaultHostUrl);
    }

    public async refreshImpl(): Promise<void> {
        this.metadata = await TrialAppTreeItem.getTrialAppMetaData(this.metadata.loginSession);
    }

    public isAncestorOfImpl?(_contextValue: string | RegExp): boolean {
        return _contextValue === TrialAppTreeItem.contextValue;
    }
}

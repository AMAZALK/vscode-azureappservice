/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AppSettingsTreeItem, DeploymentsTreeItem, LogFilesTreeItem, SiteFilesTreeItem } from 'vscode-azureappservice';
import { AzExtTreeItem, IActionContext } from 'vscode-azureextensionui';
import { localize } from '../../localize';
import { openUrl } from '../../utils/openUrl';
import { requestUtils } from '../../utils/requestUtils';
import { AzureAccountTreeItem } from '../AzureAccountTreeItem';
import { ISiteTreeItem } from '../ISiteTreeItem';
import { SiteTreeItemBase } from '../SiteTreeItemBase';
import { ITrialAppMetadata } from './ITrialAppMetadata';
import { TrialAppClient } from './TrialAppClient';

export class TrialAppTreeItem extends SiteTreeItemBase implements ISiteTreeItem {

    public get label(): string {
        return this.metadata.siteName ? this.metadata.siteName : localize('nodeJsTrialApp', 'NodeJS Trial App');
    }

    private get minutesLeft(): number {
        return (this.metadata.timeLeft / 60);
    }

    public get description(): string {
        return isNaN(this.minutesLeft) ?
            localize('expired', 'Expired') : `${this.minutesLeft.toFixed(0)} ${localize('minutesRemaining', 'min. remaining')}`;
    }

    public get id(): string {
        return `trialApp${this._defaultHostName}`;
    }
    public static contextValue: string = 'trialApp';
    public contextValue: string = TrialAppTreeItem.contextValue;

    public metadata: ITrialAppMetadata;

    public defaultHostName: string;

    public defaultHostUrl: string;

    public readonly appSettingsNode: AppSettingsTreeItem;
    public deploymentsNode: DeploymentsTreeItem;

    public client: TrialAppClient;

    private readonly _defaultHostName: string;
    private readonly _siteFilesNode: SiteFilesTreeItem;
    private readonly _logFilesNode: LogFilesTreeItem;

    private constructor(parent: AzureAccountTreeItem, metadata: ITrialAppMetadata) {
        super(parent);
        this.client = new TrialAppClient(metadata);
        this.metadata = metadata;
        this.defaultHostName = this.metadata.hostName;
        this.defaultHostUrl = `https://${this.defaultHostName}`;
        this.deploymentsNode = new DeploymentsTreeItem(parent, this.client, {}, {});
        this._siteFilesNode = new SiteFilesTreeItem(this, this.client, false);
        this._logFilesNode = new LogFilesTreeItem(this, this.client);
    }

    public static async createTrialAppTreeItem(parent: AzureAccountTreeItem, loginSession: string): Promise<TrialAppTreeItem> {
        const metadata: ITrialAppMetadata = await this.getTrialAppMetaData(loginSession);
        return new TrialAppTreeItem(parent, metadata);
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
    public async loadMoreChildrenImpl(_clearCache: boolean, _context: IActionContext): Promise<AzExtTreeItem[]> {
        return [this.deploymentsNode, this._siteFilesNode, this._logFilesNode];
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

    public isAncestorOfImpl?(contextValue: string | RegExp): boolean {
        return contextValue === TrialAppTreeItem.contextValue;
    }
}

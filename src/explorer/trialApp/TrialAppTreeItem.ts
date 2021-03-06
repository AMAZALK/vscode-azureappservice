/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AppSettingsTreeItem, LogFilesTreeItem, SiteFilesTreeItem } from 'vscode-azureappservice';
import { AzExtTreeItem, IActionContext } from 'vscode-azureextensionui';
import { localize } from '../../localize';
import { openUrl } from '../../utils/openUrl';
import { AzureAccountTreeItem } from '../AzureAccountTreeItem';
import { ISiteTreeItem } from '../ISiteTreeItem';
import { SiteTreeItemBase } from '../SiteTreeItemBase';
import { ITrialAppMetadata } from './ITrialAppMetadata';
import { TrialAppClient } from './TrialAppClient';

export class TrialAppTreeItem extends SiteTreeItemBase implements ISiteTreeItem {
    public static contextValue: string = 'trialApp';
    public contextValue: string = TrialAppTreeItem.contextValue;
    public client: TrialAppClient;
    public logFilesNode: LogFilesTreeItem;

    private readonly _appSettingsTreeItem: TrialAppApplicationSettingsTreeItem;
    private readonly _siteFilesNode: SiteFilesTreeItem;

    private constructor(parent: AzureAccountTreeItem, client: TrialAppClient) {
        super(parent);
        this.client = client;
        this._appSettingsTreeItem = new TrialAppApplicationSettingsTreeItem(this, this.client, false);
        this._siteFilesNode = new SiteFilesTreeItem(this, this.client, false);
        this.logFilesNode = new LogFilesTreeItem(this, client);
    }

    public static async createTrialAppTreeItem(parent: AzureAccountTreeItem, loginSession: string): Promise<TrialAppTreeItem> {
        const client: TrialAppClient = await TrialAppClient.createTrialAppClient(loginSession);
        return new TrialAppTreeItem(parent, client);
    }

    public get logStreamLabel(): string {
        return this.metadata.hostName;
    }

    public get metadata(): ITrialAppMetadata {
        return this.client.metadata;
    }

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
        return `trialApp${this.defaultHostName}`;
    }

    public get defaultHostName(): string {
        return this.client.fullName;
    }

    public get defaultHostUrl(): string {
        return this.client.defaultHostUrl;
    }

    public async isHttpLogsEnabled(): Promise<boolean> {
        return true;
    }

    public async loadMoreChildrenImpl(_clearCache: boolean, _context: IActionContext): Promise<AzExtTreeItem[]> {
        return [this._appSettingsTreeItem, this._siteFilesNode, this.logFilesNode];
    }
    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    public async browse(): Promise<void> {
        await openUrl(this.defaultHostUrl);
    }

    public async refreshImpl(): Promise<void> {
        this.client = await TrialAppClient.createTrialAppClient(this.metadata.loginSession);
    }

    public isAncestorOfImpl?(contextValue: string | RegExp): boolean {
        return contextValue === TrialAppTreeItem.contextValue;
    }
}

// different context value to change actions in context menu
class TrialAppApplicationSettingsTreeItem extends AppSettingsTreeItem {
    public contextValue: string = 'applicationSettingsTrialApp';
}

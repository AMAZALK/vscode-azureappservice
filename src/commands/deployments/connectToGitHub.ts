/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DeploymentsTreeItem, editScmType } from "vscode-azureappservice";
import { GenericTreeItem, IActionContext } from "vscode-azureextensionui";
import { ScmType } from "../../constants";
import { SiteTreeItem } from "../../explorer/SiteTreeItem";
import { WebAppTreeItem } from "../../explorer/WebAppTreeItem";
import { ext } from "../../extensionVariables";
import { localize } from '../../localize';

export async function connectToGitHub(context: IActionContext, target?: GenericTreeItem): Promise<void> {
    let node: WebAppTreeItem | DeploymentsTreeItem;

    if (!target) {
        node = <WebAppTreeItem>await ext.tree.showTreeItemPicker(WebAppTreeItem.contextValue, context);
    } else {
        node = <DeploymentsTreeItem>target.parent;
    }

    if (node instanceof SiteTreeItem) {
        if (node.deploymentsNode === undefined) {
            await node.refresh();
        }
        if (node.deploymentsNode) {
            await editScmType(context, node.client, node.root, ScmType.GitHub);
            await node.deploymentsNode.refresh();
        }
    } else if (node.parent instanceof SiteTreeItem) {
        await editScmType(context, node.parent.root.client, node.parent.root, ScmType.GitHub);
        await node.refresh();
    } else {
        throw Error(localize('actionNotSupported', 'Action not supported.'));
    }
}

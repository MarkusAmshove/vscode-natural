import { Event, ProviderResult, TreeDataProvider, TreeItem } from "vscode";

export class FileStatusItem extends TreeItem {
    constructor(public label: string) {
        super(label);
    }
}

export class FileStatusTreeProvider implements TreeDataProvider<FileStatusItem> {
    onDidChangeTreeData?: Event<void | FileStatusItem | FileStatusItem[] | null | undefined> | undefined;

    getTreeItem(element: FileStatusItem): TreeItem | Thenable<TreeItem> {
        return element;
    }

    getChildren(element?: FileStatusItem | undefined): ProviderResult<FileStatusItem[]> {
        if(!element) {
            return [new FileStatusItem("Dirty files")];
        }
        return [];
    }

}
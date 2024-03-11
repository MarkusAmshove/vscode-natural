import { InputOperand } from "./previewTypes";

const SPACE_IN_VIEW = "&nbsp;";

export class MapLine {
    private position: number = 1;
    private content: string = "";
    private length: number = 0;

    reposition(column: number) {
        const previousPosition = this.position;
        const spacesToAdd = column - previousPosition;
        if (spacesToAdd > 0) {
            this.writeSpaces(spacesToAdd);
        }
    }

    writeSpaces(spacesToAdd: number) {
        this.length += spacesToAdd;
        this.position += spacesToAdd;
        this.content += `<span>${spaces(spacesToAdd)}</span>`;
    }

    writeOperand(operand: InputOperand) {
        const content = operand.operand;
        const length = operand.length;
        const id = operand.id;

        this.position += length;
        this.length += length;
        let contentToRender = content.substring(0, length);

        let classes = [];
        let title = "";
        if (content.length > contentToRender.length) {
            classes.push("cutoff");
            title = content;
        }

        classes.push(`operand-${operand.type}`);

        let isRightAligned = false;
        for (const attribute of operand.attributes) {
            if (attribute.kind === "AD") {
                for (let i = 0; i < attribute.value.length; i++) {
                    const value = attribute.value[i].toLowerCase();
                    if (value === "r" || value === "z") {
                        isRightAligned = true;
                    }
                    classes.push(`ad-${value}`);
                }
            }
            // ....
        }

        if (contentToRender.length < length) {
            const spacesToAdd = length - contentToRender.length;
            const theSpaces = spaces(spacesToAdd);
            if (isRightAligned) {
                contentToRender = theSpaces + contentToRender;
            } else {
                contentToRender += theSpaces;
            }
        }

        const idAssign = id ? `id="element-${id}"` : "";
        this.content += `<span ${idAssign} class="${classes.join(" ")}" title=${title}>${contentToRender.replace(/ /g, SPACE_IN_VIEW)}</span>`;
    }

    renderHtml() {
        if (this.content.length === 0) {
            this.content = spaces(1);
        }
        return `${this.content}<br/>`;
    }
}

function spaces(spaces: number): string {
    return SPACE_IN_VIEW.repeat(spaces);
}
export type InputStructure = {
    elements: InputElement[];
};

export type InputElement = InputOperand | InputNewLine | InputTabs | InputSpaces;

export type InputOperand = {
    kind: "operand";
    type: "reference" | "literal" | "unknown";
    id: number;
    operand: string;
    length: number;
    sourceLine: number;
    sourceColumnStart: number;
    sourceColumnEnd: number;
    attributes: InputAttribute[];
};

export type InputNewLine = {
    kind: "newline";
    id: number;
};

export type InputTabs = {
    kind: "tabs";
    id: number;
    tabs: number;
};

export type InputSpaces = {
    kind: "spaces";
    id: number;
    spaces: number;
};

export type InputAttribute = {
    kind: string;
    id: number;
    value: string;
};
import { describe, expect, test } from '@jest/globals';
import { provideInlineCompletion } from "./inlinecompletion";

describe('provideInlineCompletions should', () => {
    it('complete a statement', () => {
        const completions = provideInlineCompletion("COMP", "COMP");
        expect(completions)
            .toEqual([
                'RESS ${1:#VAR} INTO ${2:#TARGET}',
                'RESS NUMERIC ${1:#VAR} INTO ${2:#TARGET}'
            ]);
    });

    it('complete a statement when more than the trigger matches', () => {
        const completions = provideInlineCompletion("COMPR", "COMPR");
        expect(completions)
            .toEqual([
                'ESS ${1:#VAR} INTO ${2:#TARGET}',
                'ESS NUMERIC ${1:#VAR} INTO ${2:#TARGET}'
            ]);
    });

    it('complete a statement case insensitive', () => {
        const completions = provideInlineCompletion("comp", "comp");
        expect(completions)
            .toEqual([
                'RESS ${1:#VAR} INTO ${2:#TARGET}',
                'RESS NUMERIC ${1:#VAR} INTO ${2:#TARGET}'
            ]);
    });

    it('completes missing parts of a statement', () => {
        const completions = provideInlineCompletion("COMPRESS NUM", "NUM");
        expect(completions)
            .toEqual([
                'ERIC ${1:#VAR} INTO ${2:#TARGET}'
            ]);
    });

    it('complete an inline expression', () => {
        const completions = provideInlineCompletion("SUBS", "SUBS");
        expect(completions)
            .toEqual([
                'TRING(${1:#STRING}, ${2:1})',
                'TRING(${1:#STRING}, ${2:1}, ${3:2})'
            ]);
    });

    it('complete an inline expression case insensitive', () => {
        const completions = provideInlineCompletion("subs", "subs");
        expect(completions)
            .toEqual([
                'TRING(${1:#STRING}, ${2:1})',
                'TRING(${1:#STRING}, ${2:1}, ${3:2})'
            ]);
    });

    it('complete different statements for same trigger', () => {
        const completions = provideInlineCompletion("writ", "writ");
        expect(completions)
            .toEqual([
                'E ${1:#VAR}',
                'E WORK FILE ${1:1}',
            ]);
    });

    it('complete only matching statements', () => {
        const completions = provideInlineCompletion("write wo", "wo");
        expect(completions)
            .toEqual([
                'RK FILE ${1:1}'
            ]);
    });
});
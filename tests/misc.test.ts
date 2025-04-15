import { extractJson } from "../src/misc";

describe('extractJson', () => {
    it('extracts a single JSON object', () => {
        const input = 'Text before {"a": 1} text after';
        const result = extractJson(input);
        expect(result.jsonObjects).toEqual([{ a: 1 }]);
        expect(result.textWithoutJson).toContain('Text before');
        expect(result.textWithoutJson).toContain('text after');
    });

    it('extracts a single JSON object and the wrapper', () => {
        const input = 'Text before ```json {"a": 1}``` text after';
        const result = extractJson(input);
        console.log( 'result', result );
        expect(result.jsonObjects).toEqual([{ a: 1 }]);
        expect(result.textWithoutJson).toBe('Text before text after');
    });

    it('extracts a multiline JSON object and the wrapper', () => {
        const input = `Text before 
\`\`\`json {"a": 1}\`\`\`
text after`;
        const result = extractJson(input);
        expect(result.jsonObjects).toEqual([{ a: 1 }]);
        expect(result.textWithoutJson).toBe('Text before\ntext after');
    });

    it('extracts multiple JSON objects', () => {
        const input = 'One {"x":10} Two {"y":20} Three';
        const result = extractJson(input);
        expect(result.jsonObjects).toEqual([{ x: 10 }, { y: 20 }]);
        expect(result.textWithoutJson).toMatch(/One\s+Two\s+Three/);
    });

    it('extracts nested JSON correctly', () => {
        const input = 'Start {"user":{"name":"Alice","meta":{"age":30}}} End';
        const result = extractJson(input);
        expect(result.jsonObjects).toEqual([{ user: { name: 'Alice', meta: { age: 30 } } }]);
        expect(result.textWithoutJson).toMatch(/Start\s+End/);
    });

    it('handles escaped characters inside strings', () => {
        const input = 'Escaped {"text":"She said \\"hello\\""} Done';
        const result = extractJson(input);
        expect(result.jsonObjects).toEqual([{ text: 'She said "hello"' }]);
        expect(result.textWithoutJson).toMatch(/Escaped\s+Done/);
    });

    it('ignores invalid JSON blocks', () => {
        const input = 'Broken {foo:bar} valid {"ok":true}';
        const result = extractJson(input);
        expect(result.jsonObjects).toEqual([{ ok: true }]);
        expect(result.textWithoutJson).toContain('Broken');
    });

    it('does not treat braces inside quotes as structure', () => {
        const input = 'Weird {"text":"brace in string { not real }"} done';
        const result = extractJson(input);
        expect(result.jsonObjects).toEqual([{ text: 'brace in string { not real }' }]);
        expect(result.textWithoutJson).toMatch(/Weird\s+done/);
    });

    it('returns empty array and same text when no JSON is present', () => {
        const input = 'Just plain text';
        const result = extractJson(input);
        expect(result.jsonObjects).toEqual([]);
        expect(result.textWithoutJson).toBe('Just plain text');
    });

    it('handles empty input', () => {
        const input = '';
        const result = extractJson(input);
        expect(result.jsonObjects).toEqual([]);
        expect(result.textWithoutJson).toBe('');
    });

    it('handles multiple lines with JSON blocks', () => {
        const input = `Header
{
  "line": 1
}
Middle
{
  "line": 2
}
Footer`;
        const result = extractJson(input);
        expect(result.jsonObjects).toEqual([{ line: 1 }, { line: 2 }]);
        expect(result.textWithoutJson).toMatch(/Header[\s\S]*Middle[\s\S]*Footer/);
    });
});

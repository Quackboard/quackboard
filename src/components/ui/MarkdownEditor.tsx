import React, { useState, useRef } from 'react';
import { Bold, Italic, List, ListOrdered, Link as LinkIcon, Eye, Code } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Textarea } from './textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';

interface MarkdownEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    showLink?: boolean;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
    value,
    onChange,
    placeholder,
    className,
    showLink = true,
}) => {
    const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
    const isYellow = wordCount >= 401 && wordCount <= 450;
    const isRed = wordCount >= 451;
    const isLimitReached = wordCount >= 500;

    const insertText = (before: string, after: string = '') => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = value.substring(start, end);
        const newValue =
            value.substring(0, start) +
            before + selectedText + after +
            value.substring(end);

        onChange(newValue);

        // Reset focus and selection
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(
                start + before.length,
                end + before.length
            );
        }, 0);
    };

    const handleBold = () => insertText('**', '**');
    const handleItalic = () => insertText('*', '*');
    const handleList = () => insertText('\n- ', '');
    const handleOrderedList = () => insertText('\n1. ', '');
    const handleLink = () => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = value.substring(start, end);

        if (selectedText) {
            insertText('[', '](url)');
        } else {
            insertText('[Link Name](', 'https://)');
        }
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newVal = e.target.value;
        const newWordCount = newVal.trim() ? newVal.trim().split(/\s+/).length : 0;

        // If we've reached 500 words, check if the user is trying to add more text
        if (newWordCount > 500 && newWordCount > wordCount) {
            return; // Block addition of new words
        }

        onChange(newVal);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter') {
            const textarea = textareaRef.current;
            if (!textarea) return;

            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const textBefore = value.substring(0, start);
            const lines = textBefore.split(/\r?\n/);
            const currentLine = lines[lines.length - 1].replace(/\r$/, '');

            // Check if current line is a numbered list
            const numberedMatch = currentLine.match(/^(\s*)(\d+)\.\s(.*)?$/);
            if (numberedMatch) {
                const indent = numberedMatch[1];
                const number = parseInt(numberedMatch[2]);
                const content = (numberedMatch[3] || '').trim();

                // Only exit if this is an empty line and we're already deep in a list
                if (content === '' && (lines.length > 1 && number > 1)) {
                    e.preventDefault();
                    const beforeLineStart = start - currentLine.length;
                    const newValue = value.substring(0, beforeLineStart) + '\n\n' + value.substring(end);
                    onChange(newValue);
                    setTimeout(() => {
                        const newPos = beforeLineStart + 2;
                        textarea.setSelectionRange(newPos, newPos);
                    }, 0);
                    return;
                }

                // Otherwise, continue the sequence
                e.preventDefault();
                const insert = `\n${indent}${number + 1}. `;
                const newValue = value.substring(0, start) + insert + value.substring(end);
                onChange(newValue);

                setTimeout(() => {
                    const newPos = start + insert.length;
                    textarea.setSelectionRange(newPos, newPos);
                }, 0);
                return;
            }

            // Check if current line is a bullet list
            const bulletMatch = currentLine.match(/^(\s*)([-*])\s(.*)?$/);
            if (bulletMatch) {
                const indent = bulletMatch[1];
                const marker = bulletMatch[2];
                const content = (bulletMatch[3] || '').trim();

                if (content === '' && lines.length > 1) {
                    e.preventDefault();
                    const beforeLineStart = start - currentLine.length;
                    const newValue = value.substring(0, beforeLineStart) + '\n\n' + value.substring(end);
                    onChange(newValue);
                    setTimeout(() => {
                        const newPos = beforeLineStart + 2;
                        textarea.setSelectionRange(newPos, newPos);
                    }, 0);
                    return;
                }

                e.preventDefault();
                const insert = `\n${indent}${marker} `;
                const newValue = value.substring(0, start) + insert + value.substring(end);
                onChange(newValue);

                setTimeout(() => {
                    const newPos = start + insert.length;
                    textarea.setSelectionRange(newPos, newPos);
                }, 0);
            }
        }
    };

    return (
        <div className={cn("flex flex-col border rounded-md overflow-hidden bg-background", className)}>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
                    <div className="flex items-center gap-1">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={handleBold}
                            title="Bold"
                        >
                            <Bold className="h-4 w-4" />
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={handleItalic}
                            title="Italic"
                        >
                            <Italic className="h-4 w-4" />
                        </Button>
                        <div className="w-[1px] h-4 bg-muted-foreground/20 mx-1" />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={handleList}
                            title="Bullet List"
                        >
                            <List className="h-4 w-4" />
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={handleOrderedList}
                            title="Numbered List"
                        >
                            <ListOrdered className="h-4 w-4" />
                        </Button>
                        {showLink && (
                            <>
                                <div className="w-[1px] h-4 bg-muted-foreground/20 mx-1" />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={handleLink}
                                    title="Link"
                                >
                                    <LinkIcon className="h-4 w-4" />
                                </Button>
                            </>
                        )}
                    </div>

                    <TabsList className="h-8">
                        <TabsTrigger value="write" className="text-xs h-7">
                            <Code className="h-3 w-3 mr-1" />
                            Write
                        </TabsTrigger>
                        <TabsTrigger value="preview" className="text-xs h-7">
                            <Eye className="h-3 w-3 mr-1" />
                            Preview
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="write" className="m-0 relative">
                    <Textarea
                        ref={textareaRef}
                        value={value}
                        onChange={handleTextChange}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        className={cn(
                            "border-0 focus-visible:ring-0 resize-none min-h-[120px] rounded-none p-4",
                            isRed ? "bg-red-50/10" : isYellow ? "bg-yellow-50/10" : ""
                        )}
                    />
                    <div className="px-3 py-1 border-t bg-muted/30 text-[10px] text-muted-foreground flex justify-end items-center">
                        <div className="flex items-center gap-2">
                            {isLimitReached && (
                                <span className="text-red-500 font-bold animate-pulse uppercase">Limit reached</span>
                            )}
                            <span className={cn(
                                "font-medium px-1.5 py-0.5 rounded",
                                isRed ? "text-red-500 bg-red-100/50" : isYellow ? "text-yellow-600 bg-yellow-100/50" : ""
                            )}>
                                {wordCount}/500 words
                            </span>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="preview" className="m-0">
                    <div className="min-h-[120px] p-4 prose prose-sm prose-primary max-w-none dark:prose-invert overflow-auto bg-background 
            prose-p:my-1 prose-headings:mb-2 prose-headings:mt-4 first:prose-p:mt-0 last:prose-p:mb-0
            [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-2 [&_li]:mb-1 [&_li]:pl-1
            [&_p]:whitespace-pre-wrap">
                        {value ? (
                            <ReactMarkdown>
                                {showLink
                                    ? value.replace(/(?<!\]\()(https?:\/\/[a-zA-Z0-9\.-]+\.[a-zA-Z]{2,}(?:\/[^\s\)]*)?(?<![\.\,\!\?\)]))/g, '[$1]($1)')
                                    : value
                                }
                            </ReactMarkdown>
                        ) : (
                            <p className="text-muted-foreground italic">Nothing to preview</p>
                        )}
                    </div>
                    <div className="px-3 py-1 border-t bg-muted/30 text-[10px] text-muted-foreground">
                        Preview mode
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};

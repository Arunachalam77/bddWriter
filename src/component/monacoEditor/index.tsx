/* eslint-disable react-refresh/only-export-components */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { MonacoEditor } from "./monoCode";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { configureMonaco } from "@cucumber/monaco";
import { ParameterTypeRegistry } from "@cucumber/cucumber-expressions";
import {
  buildSuggestions,
  ExpressionBuilder,
  jsSearchIndex,
} from "@cucumber/language-service";
import { LanguageName, Source } from "@cucumber/language-service";
import { WasmParserAdapter } from "@cucumber/language-service/wasm";
import { render } from "react-dom";
import "./style.css";
import { useEffect } from "react";

interface CodeEditor {
  value?: string;
  steps?: [];
  stepDefinitions?: any;
  theme?: string;
  featureFontSize?: number;
  featureFontWeight?: string;
  stepFontSize?: number;
  onFeatureWriter?: (value: string) => void;
}

export const CodeEditor = (props: CodeEditor) => {
  const {
    value = ``,
    steps = [],
    stepDefinitions = [],
    onFeatureWriter = () => false,
    theme = "",
    featureFontSize = 18,
    featureFontWeight = "600",
    stepFontSize = 12,
  } = props;

  // Option for code editor & cucumber
  const options = {
    value,
    language: "gherkin",
    theme: theme,
    "semanticHighlighting.enabled": true,
    fontSize: featureFontSize,
    fontWeight: featureFontWeight,
    suggestFontSize: stepFontSize,
  };

  const onchange = (value: any) => {
    console.log(value, "value");
    onFeatureWriter(value);
  };

  const stepDefinitionFunctions =
    stepDefinitions &&
    stepDefinitions.map((val: any) => {
      return `@${val.keyword}("${val.fields.Step}")
  function function() {
    // Step definition logic
  }
  `;
    });

  // To initialize the code editor with cucumber--
  const initializeEditor = async () => {
    try {
      monaco.languages.register({ id: "typescript" });

      // default suggestion method
      monaco.languages.registerCompletionItemProvider("gherkin", {
        provideCompletionItems: (
          model: monaco.editor.ITextModel,
          position: monaco.Position
          // context: monaco.languages.CompletionContext,
          // token: monaco.CancellationToken
        ): monaco.languages.CompletionList => {
          const wordUntil = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            startColumn: wordUntil.startColumn,
            endLineNumber: position.lineNumber,
            endColumn: wordUntil.endColumn,
          };

          const userTypedText = model.getValueInRange(range);
          const suggestions: monaco.languages.CompletionItem[] = [
            {
              label: "Given",
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: "Given ",
              range: range,
            },
            {
              label: "When",
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: "When ",
              range: range,
            },
            {
              label: "Then",
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: "Then ",
              range: range,
            },
            {
              label: "And",
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: "And ",
              range: range,
            },
            {
              label: "But",
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: "But ",
              range: range,
            },
            {
              label: "Background",
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: "Background:",
              range: range,
            },
            {
              label: "Scenario Outline",
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: "Scenario Outline:",
              range: range,
            },
          ];

          if (userTypedText.length === 0) {
            return {
              suggestions: suggestions,
            };
          } else {
            const filteredSuggestions = suggestions.filter((suggestion) =>
              (suggestion.label as string)
                .toLowerCase()
                .startsWith(userTypedText.toLowerCase())
            );
            return {
              suggestions: filteredSuggestions,
            };
          }
        },
      });

      // Initialize the WasmParserAdapter method
      const adapter = new WasmParserAdapter(".");
      await adapter.init();
      const expressionBuilder = new ExpressionBuilder(adapter);

      //steps definition popup
      const sources: Source<LanguageName>[] = [
        {
          languageName: "javascript",
          uri: "",
          content: `
          class StepDefinitions {
            ${stepDefinitionFunctions}
          }
        `,
        },
      ];
      const { expressionLinks } = expressionBuilder.build(sources, []);
      const expressions: any = expressionLinks.map((link) => link.expression);
      const registry: any = new ParameterTypeRegistry();
      const docs = buildSuggestions(registry, steps, expressions);

      // used for filter
      // const uniqueSuggestions = new Set();

      // const filteredDocs = docs.filter((suggestion) => {
      //   const suggestionKey = suggestion;

      //   if (uniqueSuggestions.has(suggestionKey)) {
      //     return false;
      //   }

      //   uniqueSuggestions.add(suggestionKey);

      //   return true;
      // });

      // console.log(filteredDocs, "filteredDocs");

      const index = jsSearchIndex(docs);
      const configureEditor = configureMonaco(monaco, index, expressions);
      if (configureEditor) {
        render(
          <MonacoEditor
            options={options}
            className="editor"
            configure={configureEditor}
            onChange={onchange}
          />,
          document.getElementById("editor")
        );
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    initializeEditor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div id="editor"></div>
    </>
  );
};

CodeEditor.defaultProps = {
  value: `Feature: Login

  Background: demo

  Scenario: login for demo
    Then I accept the popup

  Scenario Outline: 
    Given I am accepting the popups

    `,
  steps: [],
  stepDefinitions: [
    {
      keyword: "Given",
      fields: {
        Step: "I accept the popup",
      },
    },
    {
      keyword: "Given",
      fields: {
        Step: "I am accepting the popups",
      },
    },
  ],
  onFeatureWriter: () => false,
  theme: "",
  featureFontSize: 18,
  featureFontWeight: "600",
  stepFontSize: 12,
};

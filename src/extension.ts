import * as vscode from "vscode";

const regex = /<a?:.+?:(\d{17,})>/g;

function getEmotesFromText(text: string) {
	return [...text.matchAll(regex)];
}

function getRenderedEmote(emote: RegExpMatchArray) {
	const uri = vscode.Uri.parse(
		`https://cdn.discordapp.com/emojis/${emote[1]}.${
			emote[0].startsWith("<a") ? "gif" : "png"
		}?size=16`
	);

	return uri;
}

const emoteDecoration = vscode.window.createTextEditorDecorationType({
	after: {
		margin: "0 0 0 0",
		height: "16px",
		width: "16px",
		textDecoration: "none",
	},
	rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
});

class StringAnnotation implements vscode.Disposable {
	private _disposable: vscode.Disposable;
	private _editor: vscode.TextEditor | undefined;

	constructor() {
		this._disposable = vscode.Disposable.from(
			vscode.workspace.onDidChangeTextDocument(this.onDidChange, this),
			vscode.window.onDidChangeActiveTextEditor(this.onDidChange, this)
		);

		this.refresh(vscode.window.activeTextEditor);
	}

	onDidChange() {
		this._editor = vscode.window.activeTextEditor;
		void this.refresh(vscode.window.activeTextEditor);
	}

	refresh(editor: vscode.TextEditor | undefined) {
		if (editor === undefined) {
			return;
		}

		// Go line by line and find all the emotes
		const lines = editor.document.lineCount || 0;

		const decorations: vscode.DecorationOptions[] = [];
		for (let i = 0; i < lines; i++) {
			const line = editor.document.lineAt(i);
			const text = line.text;

			const emotes = getEmotesFromText(text);

			if (emotes.length < 1) {
				continue;
			}

			for (const emote of emotes) {
				const rendered = getRenderedEmote(emote);
				const start = line.range.start.translate(0, emote.index!);
				const end = line.range.start.translate(
					0,
					emote.index! + emote[0].length
				);
				const range = new vscode.Range(start, end);
				decorations.push({
					range: range,
					renderOptions: {
						after: {
							contentIconPath: rendered,
						},
					},
				});
			}
		}

		editor.setDecorations(emoteDecoration, decorations);
	}

	clearAnnotations(editor: vscode.TextEditor | undefined) {
		if (editor === undefined || (editor as any)._disposed === true) {
			return;
		}

		editor.setDecorations(emoteDecoration, []);
	}

	dispose() {
		this.clearAnnotations(this._editor);
		this._disposable.dispose();
	}
}

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(new StringAnnotation());
}

export function deactivate() {}

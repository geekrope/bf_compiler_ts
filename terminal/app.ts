const consoleID = "console";
const inputBoxID = "inputBox";
const caretID = "caret";
const sourceCodeId = "sourceCode";

interface String
{
	splice(index: number, deleteCount: number, insert: string): string;
}

String.prototype.splice = function (index: number, deleteCount: number, insert: string)
{
	return this.slice(0, index) + insert + this.slice(index + deleteCount, this.length);
}

class TerminalViewModel
{
	private _consoleElement: HTMLElement | null;
	private _inputBoxElement: HTMLElement | null;
	private _caretElement: HTMLElement | null;

	public get consoleElement(): HTMLElement
	{
		if (this._consoleElement)
		{
			return this._consoleElement
		}
		else
		{
			return this._consoleElement = document.getElementById(consoleID)!;
		}
	}
	public get inputBoxElement(): HTMLElement
	{
		if (this._inputBoxElement)
		{
			return this._inputBoxElement
		}
		else
		{
			return this._inputBoxElement = document.getElementById(inputBoxID)!;
		}
	}
	public get caretElement(): HTMLElement
	{
		if (this._caretElement)
		{
			return this._caretElement
		}
		else
		{
			return this._caretElement = document.getElementById(caretID)!;
		}
	}

	public createCharacterElement(character: string): HTMLElement
	{
		const element = document.createElement("p");
		element.innerHTML = character;
		element.className = "text";

		return element;
	}
	public createLineElement(content: string): HTMLElement
	{
		const element = document.createElement("p");
		element.innerHTML = content;
		element.className = "text";

		return element;
	}
	public addCharacter(characterElement: HTMLElement)
	{
		this.inputBoxElement.insertBefore(characterElement, this.caretElement);
	}
	public addLine(lineElement: HTMLElement, before: HTMLElement | null = null)
	{
		if (before)
		{
			this.consoleElement.insertBefore(lineElement, before);
		}
		else
		{
			this.consoleElement.appendChild(lineElement);
		}
	}
	public focus(): void
	{
		this.caretElement.style.display = "block";
	}
	public unfocus(): void
	{
		this.caretElement.style.display = "none";
	}
	public removeCharacter(characterElement: HTMLElement | undefined)
	{
		if (characterElement)
		{
			this.inputBoxElement.removeChild(characterElement);
		}
	}
	public clearInputBox()
	{
		const caret = this.caretElement;

		this.inputBoxElement.innerHTML = "";
		this.inputBoxElement.appendChild(caret);
	}
	public popUpInputBox()
	{
		const inputBox = this.inputBoxElement;

		this.consoleElement.removeChild(inputBox);
		this.consoleElement.appendChild(inputBox);
	}
	public moveCaret(nextCharacterElement: HTMLElement | undefined)
	{
		this.inputBoxElement.removeChild(this.caretElement);

		if (nextCharacterElement)
		{
			this.inputBoxElement.insertBefore(this.caretElement, nextCharacterElement);
		}
		else
		{
			this.inputBoxElement.appendChild(this.caretElement);
		}
	}
	public removeCaretBlink(timeout: number)
	{
		this.caretElement.style.animation = "none";

		setTimeout((() =>
		{
			this.caretElement.style.removeProperty("animation");
		}).bind(this), timeout);
	}

	public constructor()
	{
		this._consoleElement = null;
		this._inputBoxElement = null;
		this._caretElement = null;
	}
}

interface InputEventHanlder
{
	(input: string): void;
}

type TerminalEventType = "onInput";

interface TerminalEventMap
{
	"onInput": InputEventHanlder;
}

class Terminal
{
	private _viewModel: TerminalViewModel;
	private _caretPosition: number;
	private _input: string;
	private _characters: HTMLElement[];
	private _currentLine: HTMLElement | null;
	private _onInput: InputEventHanlder[];
	private _terminalFocused: boolean;
	private _waitingForCharacter: boolean;

	private get input(): string
	{
		return this._input;
	}
	private get currentCharacter(): HTMLElement | undefined
	{
		return this._characters[this._caretPosition];
	}

	private updateCaretPosition()
	{
		this._viewModel.moveCaret(this._characters[this._caretPosition + 1]);
	}
	private moveCaretLeft(): void
	{
		if (this._caretPosition > -1)
		{
			this._caretPosition--;
		}

		this.updateCaretPosition();
	}
	private moveCaretRight(): void
	{
		if (this._caretPosition < this._characters.length - 1)
		{
			this._caretPosition++;
		}

		this.updateCaretPosition();
	}
	private insert(character: string)
	{
		const characterElement = this._viewModel.createCharacterElement(character);

		this._viewModel.addCharacter(characterElement);
		this._caretPosition++;
		this._input = this._input.splice(this._caretPosition, 0, character);
		this._characters.splice(this._caretPosition, 0, characterElement);
	}
	private erase()
	{
		this._viewModel.removeCharacter(this.currentCharacter);
		this._characters.splice(this._caretPosition, 1);
		this._input = this._input.splice(this._caretPosition, 1, "");

		this.moveCaretLeft();
	}
	private clearInput()
	{
		this._viewModel.clearInputBox();
		this._characters.splice(0, this._characters.length);
		this._input = "";
	}
	private enter(substituteEmptyInput: string = "⠀")
	{
		const input = this.input == "" ? substituteEmptyInput : this.input;
		const lineElement = this._viewModel.createLineElement(input);

		this._viewModel.addLine(lineElement, this._viewModel.inputBoxElement);

		this.clearInput();

		this._viewModel.popUpInputBox();
		this._currentLine = null;
		this._caretPosition = -1;
	}

	public addEventListener(type: TerminalEventType, handler: TerminalEventMap[TerminalEventType]): void
	public addEventListener(_type: "onInput", handler: InputEventHanlder): void
	{
		this._onInput.push(handler);
	}

	public writeKey(value: string)
	{
		if (this._currentLine == null)
		{
			this._currentLine = this._viewModel.createLineElement(value);
			this._viewModel.addLine(this._currentLine);
		}
		else
		{
			this._currentLine.innerText += value;
		}
	}
	public writeLine(value: string)
	{
		const lineElement = this._viewModel.createLineElement(value);

		this._viewModel.addLine(lineElement);
		this.enter("");
	}
	public readKey(): Promise<string>
	{
		this._waitingForCharacter = true;

		return new Promise(((resolve: (value: string) => void, _reject: any) =>
		{
			this.addEventListener("onInput", ((key: string) =>
			{
				resolve(key);
				this._waitingForCharacter = false;
			}).bind(this));
		}).bind(this));
	}

	public constructor()
	{
		this._viewModel = new TerminalViewModel();
		this._caretPosition = -1;
		this._input = "";
		this._characters = [];
		this._currentLine = null;
		this._onInput = [];
		this._terminalFocused = false;
		this._waitingForCharacter = false;

		document.onkeydown = ((event: KeyboardEvent) =>
		{
			if (this._terminalFocused && this._waitingForCharacter)
			{
				switch (event.code)
				{
					case "Backspace":
						this.erase();
						break;
					case "Enter":
						this.enter();
						break;
					case "ArrowLeft":
						this.moveCaretLeft();
						break;
					case "ArrowRight":
						this.moveCaretRight();
						break;
					default:
						if (event.key.length == 1)
						{
							this.insert(event.key);

							let currentHandler = this._onInput.shift();
							while (currentHandler)
							{
								currentHandler(event.key);
								currentHandler = this._onInput.shift();
							}

							this._viewModel.removeCaretBlink(500);
						}
				}
			}
		}).bind(this);
		document.getElementById(consoleID)?.addEventListener("focusin", (() =>
		{
			this._viewModel.focus();
			this._terminalFocused = true;
		}).bind(this));
		document.getElementById(consoleID)?.addEventListener("focusout", (() =>
		{
			this._viewModel.unfocus();
			this._terminalFocused = false;
		}).bind(this));
	}
}

let terminal: Terminal | undefined = undefined;

function run()
{
	const sourceCodeElement = document.getElementById(sourceCodeId) as HTMLTextAreaElement;

	if (sourceCodeElement && terminal)
	{
		const programText = sourceCodeElement.value;
		const tokens = Interpreter.Tokenize(programText, { ignoreUnknownCharacters: true });
		const environment = new TypescriptExecutionEnvironment({ allowNegativePointer: true, dynamicHeap: false }, terminal);
		const block = Interpreter.ExpressionTree(tokens, environment);
		TypescriptExecutionEnvironment.Execute(block);
	}
	else if (!terminal)
	{
		console.log("window has not loaded yet");
	}
}

window.addEventListener("load", async () =>
{
	terminal = new Terminal();
	terminal.writeLine("brainfvck execution envirnment successfully loaded");
});
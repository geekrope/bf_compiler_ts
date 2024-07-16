const consoleID = "console";
const inputBoxID = "inputBox";

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

	private get consoleElement(): HTMLElement
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
	private get inputBoxElement(): HTMLElement
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

	public createCharacterElement(character: string): HTMLElement
	{
		const element = document.createElement("p");
		element.innerHTML = character;
		element.className = "text input";

		return element;
	}
	public createLineElement(content: string): HTMLElement
	{
		const element = document.createElement("p");
		element.innerHTML = content;
		element.className = "text";

		return element;
	}
	public addCharacter(characterElement: HTMLElement, currentCharacterElement: HTMLElement | undefined)
	{
		const nextCharacterElement = currentCharacterElement?.nextElementSibling;

		if (nextCharacterElement)
		{
			this.inputBoxElement.insertBefore(characterElement, nextCharacterElement);
		}
		else
		{
			this.inputBoxElement.appendChild(characterElement);
		}
	}
	public addLine(lineElement: HTMLElement)
	{
		this.consoleElement.insertBefore(lineElement, this.inputBoxElement);
	}
	public clearInputBox()
	{
		this.inputBoxElement.innerHTML = "";
	}
	public removeCharacter(characterElement: HTMLElement | undefined)
	{
		if (characterElement)
		{
			this.inputBoxElement.removeChild(characterElement);
		}
	}
	public removeSelection(element: Element | undefined): void
	{
		if (element)
		{
			element.classList.remove("input");
		}
	}
	public setSelection(element: Element | undefined): void
	{
		if (element)
		{
			element.classList.add("input");
		}
	}

	public constructor()
	{
		this._consoleElement = null;
		this._inputBoxElement = null;
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

	private moveCaretLeft(): void
	{
		this._viewModel.removeSelection(this.currentCharacter);

		if (this._caretPosition > 0)
		{
			this._caretPosition--;
		}

		this._viewModel.setSelection(this.currentCharacter);
	}
	private moveCaretRight(): void
	{
		this._viewModel.removeSelection(this.currentCharacter);

		if (this._caretPosition < this._characters.length - 1)
		{
			this._caretPosition++;
		}

		this._viewModel.setSelection(this.currentCharacter);
	}
	private insert(character: string)
	{
		const characterElement = this._viewModel.createCharacterElement(character);

		this._viewModel.removeSelection(this.currentCharacter);
		this._viewModel.addCharacter(characterElement, this.currentCharacter);
		this._caretPosition++;
		this._input = this._input.splice(this._caretPosition, 0, character);
		this._characters.splice(this._caretPosition, 0, characterElement);
	}
	private erase()
	{
		this._viewModel.removeCharacter(this.currentCharacter);
		this._characters.splice(this._caretPosition, 1);
		this._input = this._input.splice(this._caretPosition, 1, "");

		if (this._characters.length == 0)
		{
			this._caretPosition = -1;
		}
		else if (this._caretPosition > 0)
		{
			this._caretPosition--;
		}

		this._viewModel.setSelection(this.currentCharacter);
	}
	private enter()
	{
		const input = this.input == "" ? "⠀" : this.input;
		const lineElement = this._viewModel.createLineElement(input);

		this._viewModel.addLine(lineElement);
		this._viewModel.clearInputBox();
		this._input = "";
		this._caretPosition = -1;
	}

	public addEventListener(type: TerminalEventType, handler: TerminalEventMap[TerminalEventType]): void
	public addEventListener(_type: "onInput", handler: InputEventHanlder): void
	{
		this._onInput.push(handler);
	}

	public writeLine(value: string)
	{
		const lineElement = this._viewModel.createLineElement(value);

		this._viewModel.addLine(lineElement);
		this._viewModel.clearInputBox();
		this._input = "";
		this._caretPosition = -1;
	}
	public readKey(): Promise<string>
	{
		this._waitingForCharacter = true;

		return new Promise(((resolve: (value: string) => void, _reject: any) =>
		{
			this.addEventListener("onInput", (key) =>
			{
				resolve(key);
			})
		}).bind(this));
	}

	public constructor()
	{
		this._viewModel = new TerminalViewModel();
		this._caretPosition = -1;
		this._input = "";
		this._characters = [];
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

							this._onInput.forEach((handler) =>
							{
								handler(event.key);
							});

							this._onInput.splice(0, this._onInput.length);
						}
				}
			}
		}).bind(this);
		document.getElementById(consoleID)?.addEventListener("focusin", (() =>
		{
			this._viewModel.setSelection(this.currentCharacter);
			this._terminalFocused = true;
		}).bind(this));
		document.getElementById(consoleID)?.addEventListener("focusout", (() =>
		{
			this._viewModel.removeSelection(this.currentCharacter);
			this._terminalFocused = false;
		}).bind(this));
	}
}

window.addEventListener("load", async () =>
{
	const terminal = new Terminal();

	terminal.writeLine("!!!COMPILATION STARTED!!!");
	console.log(await terminal.readKey());
});
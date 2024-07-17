"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const consoleID = "console";
const inputBoxID = "inputBox";
const caretID = "caret";
String.prototype.splice = function (index, deleteCount, insert) {
    return this.slice(0, index) + insert + this.slice(index + deleteCount, this.length);
};
class TerminalViewModel {
    constructor() {
        this._consoleElement = null;
        this._inputBoxElement = null;
        this._caretElement = null;
    }
    get consoleElement() {
        if (this._consoleElement) {
            return this._consoleElement;
        }
        else {
            return this._consoleElement = document.getElementById(consoleID);
        }
    }
    get inputBoxElement() {
        if (this._inputBoxElement) {
            return this._inputBoxElement;
        }
        else {
            return this._inputBoxElement = document.getElementById(inputBoxID);
        }
    }
    get caretElement() {
        if (this._caretElement) {
            return this._caretElement;
        }
        else {
            return this._caretElement = document.getElementById(caretID);
        }
    }
    createCharacterElement(character) {
        const element = document.createElement("p");
        element.innerHTML = character;
        element.className = "text";
        return element;
    }
    createLineElement(content) {
        const element = document.createElement("p");
        element.innerHTML = content;
        element.className = "text";
        return element;
    }
    addCharacter(characterElement) {
        this.inputBoxElement.insertBefore(characterElement, this.caretElement);
    }
    addLine(lineElement) {
        this.consoleElement.insertBefore(lineElement, this.inputBoxElement);
    }
    focus() {
        this.caretElement.style.display = "block";
    }
    unfocus() {
        this.caretElement.style.display = "none";
    }
    removeCharacter(characterElement) {
        if (characterElement) {
            this.inputBoxElement.removeChild(characterElement);
        }
    }
    clearInputBox() {
        const caret = this.caretElement;
        this.inputBoxElement.innerHTML = "";
        this.inputBoxElement.appendChild(caret);
    }
    moveCaret(nextCharacterElement) {
        this.inputBoxElement.removeChild(this.caretElement);
        if (nextCharacterElement) {
            this.inputBoxElement.insertBefore(this.caretElement, nextCharacterElement);
        }
        else {
            this.inputBoxElement.appendChild(this.caretElement);
        }
    }
    removeCaretBlink(timeout) {
        this.caretElement.style.animation = "none";
        setTimeout((() => {
            this.caretElement.style.removeProperty("animation");
        }).bind(this), timeout);
    }
}
class Terminal {
    constructor() {
        var _a, _b;
        this._viewModel = new TerminalViewModel();
        this._caretPosition = -1;
        this._input = "";
        this._characters = [];
        this._onInput = [];
        this._terminalFocused = false;
        this._waitingForCharacter = false;
        document.onkeydown = ((event) => {
            if (this._terminalFocused && this._waitingForCharacter) {
                switch (event.code) {
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
                        if (event.key.length == 1) {
                            this.insert(event.key);
                            this._onInput.forEach((handler) => {
                                handler(event.key);
                            });
                            this._viewModel.removeCaretBlink(500);
                            this._onInput.splice(0, this._onInput.length);
                        }
                }
            }
        }).bind(this);
        (_a = document.getElementById(consoleID)) === null || _a === void 0 ? void 0 : _a.addEventListener("focusin", (() => {
            this._viewModel.focus();
            this._terminalFocused = true;
        }).bind(this));
        (_b = document.getElementById(consoleID)) === null || _b === void 0 ? void 0 : _b.addEventListener("focusout", (() => {
            this._viewModel.unfocus();
            this._terminalFocused = false;
        }).bind(this));
    }
    get input() {
        return this._input;
    }
    get currentCharacter() {
        return this._characters[this._caretPosition];
    }
    updateCaretPosition() {
        this._viewModel.moveCaret(this._characters[this._caretPosition + 1]);
    }
    moveCaretLeft() {
        if (this._caretPosition > -1) {
            this._caretPosition--;
        }
        this.updateCaretPosition();
    }
    moveCaretRight() {
        if (this._caretPosition < this._characters.length - 1) {
            this._caretPosition++;
        }
        this.updateCaretPosition();
    }
    insert(character) {
        const characterElement = this._viewModel.createCharacterElement(character);
        this._viewModel.addCharacter(characterElement);
        this._caretPosition++;
        this._input = this._input.splice(this._caretPosition, 0, character);
        this._characters.splice(this._caretPosition, 0, characterElement);
    }
    erase() {
        this._viewModel.removeCharacter(this.currentCharacter);
        this._characters.splice(this._caretPosition, 1);
        this._input = this._input.splice(this._caretPosition, 1, "");
        this.moveCaretLeft();
    }
    enter() {
        const input = this.input == "" ? "⠀" : this.input;
        const lineElement = this._viewModel.createLineElement(input);
        this._viewModel.addLine(lineElement);
        this._viewModel.clearInputBox();
        this._input = "";
        this._caretPosition = -1;
    }
    addEventListener(_type, handler) {
        this._onInput.push(handler);
    }
    writeLine(value) {
        const lineElement = this._viewModel.createLineElement(value);
        this._viewModel.addLine(lineElement);
        this._viewModel.clearInputBox();
        this._input = "";
        this._caretPosition = -1;
    }
    readKey() {
        this._waitingForCharacter = true;
        return new Promise(((resolve, _reject) => {
            this.addEventListener("onInput", (key) => {
                resolve(key);
            });
        }).bind(this));
    }
}
window.addEventListener("load", () => __awaiter(void 0, void 0, void 0, function* () {
    const terminal = new Terminal();
    terminal.writeLine("!!!COMPILATION STARTED!!!");
    console.log(yield terminal.readKey());
}));
//# sourceMappingURL=app.js.map
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
const sourceCodeId = "sourceCode";
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
    popUpInputBox() {
        const inputBox = this.inputBoxElement;
        this.consoleElement.removeChild(inputBox);
        this.consoleElement.appendChild(inputBox);
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
        this._suspendedCharacters = [];
        this._characters = [];
        this._currentLine = null;
        this._onInput = [];
        this._terminalFocused = false;
        this._waitingForInput = false;
        document.onkeydown = ((event) => {
            if (this._terminalFocused && this._waitingForInput) {
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
                            this._viewModel.removeCaretBlink(500);
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
    get nextCharacter() {
        return this._suspendedCharacters.shift();
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
    clearInput() {
        this._viewModel.clearInputBox();
        this._characters.splice(0, this._characters.length);
        this._input = "";
    }
    enter(substituteEmptyInput = "⠀") {
        const input = this.input == "" ? substituteEmptyInput : this.input;
        const lineElement = this._viewModel.createLineElement(input);
        this._viewModel.addLine(lineElement);
        this._suspendedCharacters = this._suspendedCharacters.concat(this._input.split(''));
        const character = this.nextCharacter;
        if (character) {
            this.nofityEventHandlers("onInput", character);
        }
        this.clearInput();
        this._viewModel.popUpInputBox();
        this._currentLine = null;
        this._waitingForInput = false;
        this._caretPosition = -1;
    }
    addEventListener(_type, handler) {
        this._onInput.push(handler);
    }
    nofityEventHandlers(_type, key) {
        let currentHandler = this._onInput.shift();
        while (currentHandler) {
            currentHandler(key);
            currentHandler = this._onInput.shift();
        }
    }
    writeKey(value) {
        if (this._currentLine == null) {
            this._currentLine = this._viewModel.createLineElement(value);
            this._viewModel.addLine(this._currentLine);
        }
        else {
            this._currentLine.innerText += value;
        }
    }
    writeLine(value) {
        const lineElement = this._viewModel.createLineElement(value);
        this._viewModel.addLine(lineElement);
        this.enter("");
    }
    readKey() {
        const suspendedCharacter = this.nextCharacter;
        if (!suspendedCharacter) {
            this._waitingForInput = true;
            return new Promise(((resolve, _reject) => {
                this.addEventListener("onInput", ((key) => {
                    resolve(key);
                }).bind(this));
            }).bind(this));
        }
        else {
            return new Promise(((resolve, _reject) => {
                this.nofityEventHandlers("onInput", suspendedCharacter);
                resolve(suspendedCharacter);
            }).bind(this));
        }
    }
}
let terminal = undefined;
let worker = undefined;
let broadcastChannelClient = undefined;
function runInterpreter() {
    return navigator.serviceWorker.register("./interpreter.js");
}
function terminateInterpreter() {
    throw Error("not implemented");
}
function runProgram() {
    const sourceCodeElement = document.getElementById(sourceCodeId);
    broadcastChannelClient === null || broadcastChannelClient === void 0 ? void 0 : broadcastChannelClient.postMessage({ type: "run", data: sourceCodeElement.value });
}
window.addEventListener("load", () => __awaiter(void 0, void 0, void 0, function* () {
    terminal = new Terminal();
    broadcastChannelClient = new BroadcastChannel("sw-messages");
    worker = yield runInterpreter();
    broadcastChannelClient.addEventListener("message", (event) => {
        switch (event.data["type"]) {
            case "info":
                terminal === null || terminal === void 0 ? void 0 : terminal.writeLine(event.data["data"]);
                break;
            case "reading":
                terminal === null || terminal === void 0 ? void 0 : terminal.readKey().then((input) => {
                    broadcastChannelClient === null || broadcastChannelClient === void 0 ? void 0 : broadcastChannelClient.postMessage({ type: "input", data: input });
                });
                break;
            case "print":
                terminal === null || terminal === void 0 ? void 0 : terminal.writeKey(event.data["data"]);
                break;
            default:
                console.error("unknown message type");
        }
    });
    if (worker) {
        terminal.writeLine("brainfvck execution environment successfully loaded");
    }
}));
//# sourceMappingURL=app.js.map
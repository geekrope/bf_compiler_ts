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
var Token;
(function (Token) {
    Token[Token["invalid"] = 0] = "invalid";
    Token[Token["next"] = 1] = "next";
    Token[Token["previous"] = 2] = "previous";
    Token[Token["add"] = 3] = "add";
    Token[Token["subtract"] = 4] = "subtract";
    Token[Token["print"] = 5] = "print";
    Token[Token["read"] = 6] = "read";
    Token[Token["cycleBegin"] = 7] = "cycleBegin";
    Token[Token["cycleEnd"] = 8] = "cycleEnd";
})(Token || (Token = {}));
class Block {
    constructor(next, context) {
        this.next = next;
        this.context = context;
    }
    get Next() {
        return this.next;
    }
    set Next(value) {
        this.next = value;
    }
}
class EmptyBlock extends Block {
    Execute() {
        return __awaiter(this, void 0, void 0, function* () {
            // do nothing
        });
    }
    constructor(next, context) {
        super(next, context);
    }
}
class FunctionalBlock extends Block {
    constructor(next, context, action) {
        super(next, context);
        this.action = action;
    }
    Execute() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.action(this.context);
        });
    }
}
class CycleStartBlock extends Block {
    constructor(next, context) {
        super(next, context);
        this.cycleEnd = null;
    }
    get CycleEnd() {
        return this.cycleEnd;
    }
    set CycleEnd(value) {
        this.cycleEnd = value;
    }
    get Next() {
        if (this.context.Current === 0) {
            return this.cycleEnd ? this.cycleEnd : null;
        }
        else {
            return this.next;
        }
    }
    set Next(value) {
        this.next = value;
    }
    Execute() {
        return __awaiter(this, void 0, void 0, function* () {
            // do nothing
        });
    }
}
class CycleEndBlock extends Block {
    constructor(next, context, cycleStart) {
        super(next, context);
        this.cycleStart = cycleStart;
    }
    get Next() {
        if (this.context.Current !== 0) {
            return this.cycleStart;
        }
        else {
            return this.next;
        }
    }
    set Next(value) {
        this.next = value;
    }
    Execute() {
        return __awaiter(this, void 0, void 0, function* () {
            // do nothing
        });
    }
}
class TypescriptExecutionEnvironment {
    constructor(parameters, terminal) {
        this.pointer = 0;
        this.heap = new Uint8Array(30000);
        this.parameters = parameters;
        this.terminal = terminal;
    }
    get Current() {
        return this.heap[this.pointer];
    }
    set Current(value) {
        this.heap[this.pointer] = value;
    }
    static Execute(block) {
        return __awaiter(this, void 0, void 0, function* () {
            let current = block;
            while (current !== null) {
                yield current.Execute();
                current = current.Next;
            }
        });
    }
    Next() {
        this.pointer++;
        if (this.pointer >= this.heap.length && this.parameters.dynamicHeap) {
            const copy = new Uint8Array(this.heap.length * 2);
            copy.set(this.heap);
            this.heap = copy;
        }
        else if (this.pointer >= this.heap.length) {
            throw new RangeError("Pointer is out of memory bounds");
        }
    }
    Previous() {
        this.pointer--;
        if (this.pointer < 0 && this.parameters.allowNegativePointer) {
            this.pointer = this.heap.length - 1;
        }
        else if (this.pointer < 0) {
            throw new RangeError("Program pointer is out of memory bounds");
        }
    }
    Add() {
        this.heap[this.pointer] += 1;
    }
    Subtract() {
        this.heap[this.pointer] -= 1;
    }
    Print() {
        this.terminal.writeKey(String.fromCharCode(this.Current));
    }
    Read() {
        return __awaiter(this, void 0, void 0, function* () {
            const input = yield this.terminal.readKey();
            this.Current = input.charCodeAt(0);
        });
    }
}
class Interpreter {
    static Tokenize(code, parameters) {
        const tokens = [];
        for (let index = 0; index < code.length; index++) {
            let currentToken = Token.invalid;
            switch (code[index]) {
                case ">":
                    currentToken = Token.next;
                    break;
                case "<":
                    currentToken = Token.previous;
                    break;
                case "+":
                    currentToken = Token.add;
                    break;
                case "-":
                    currentToken = Token.subtract;
                    break;
                case ".":
                    currentToken = Token.print;
                    break;
                case ",":
                    currentToken = Token.read;
                    break;
                case "[":
                    currentToken = Token.cycleBegin;
                    break;
                case "]":
                    currentToken = Token.cycleEnd;
                    break;
            }
            if (parameters.ignoreUnknownCharacters && currentToken === Token.invalid) {
                continue;
            }
            tokens.push(currentToken);
        }
        return tokens;
    }
    static ExpressionTree(tokens, environment) {
        const start = new EmptyBlock(null, environment);
        let current = start;
        const cycleStart = [];
        for (let index = 0; index < tokens.length; index++) {
            let upcomingBlock;
            switch (tokens[index]) {
                case Token.next:
                    upcomingBlock = new FunctionalBlock(null, environment, (context) => __awaiter(this, void 0, void 0, function* () {
                        context.Next();
                    }));
                    break;
                case Token.previous:
                    upcomingBlock = new FunctionalBlock(null, environment, (context) => __awaiter(this, void 0, void 0, function* () {
                        context.Previous();
                    }));
                    break;
                case Token.add:
                    upcomingBlock = new FunctionalBlock(null, environment, (context) => __awaiter(this, void 0, void 0, function* () {
                        context.Add();
                    }));
                    break;
                case Token.subtract:
                    upcomingBlock = new FunctionalBlock(null, environment, (context) => __awaiter(this, void 0, void 0, function* () {
                        context.Subtract();
                    }));
                    break;
                case Token.print:
                    upcomingBlock = new FunctionalBlock(null, environment, (context) => __awaiter(this, void 0, void 0, function* () {
                        context.Print();
                    }));
                    break;
                case Token.read:
                    upcomingBlock = new FunctionalBlock(null, environment, (context) => __awaiter(this, void 0, void 0, function* () {
                        yield context.Read();
                    }));
                    break;
                case Token.cycleBegin:
                    const cycleBeginBlock = new CycleStartBlock(null, environment);
                    upcomingBlock = cycleBeginBlock;
                    cycleStart.push(cycleBeginBlock);
                    break;
                case Token.cycleEnd:
                    if (cycleStart.length === 0) {
                        throw new Error("Unmatched ]");
                    }
                    else {
                        const cycleStartBlock = cycleStart.pop();
                        const cycleEndBlock = new CycleEndBlock(null, environment, cycleStartBlock);
                        upcomingBlock = cycleEndBlock;
                        cycleStartBlock.CycleEnd = cycleEndBlock;
                    }
                    break;
                default:
                    throw new Error("Invalid token");
            }
            current.Next = upcomingBlock;
            current = upcomingBlock;
        }
        if (cycleStart.length > 0) {
            throw new Error("Unmatched [");
        }
        return start;
    }
}
//# sourceMappingURL=interpreter.js.map
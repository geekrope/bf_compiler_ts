"use strict";
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
    async Execute() {
        // do nothing
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
    async Execute() {
        await this.action(this.context);
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
    async Execute() {
        // do nothing
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
    async Execute() {
        // do nothing
    }
}
class TypescriptExecutionEnvironment {
    constructor(parameters, terminal) {
        this.pointer = 0;
        this.heap = new Uint8Array(30000);
        this.parameters = parameters;
        this.io = terminal;
    }
    get Current() {
        return this.heap[this.pointer];
    }
    set Current(value) {
        this.heap[this.pointer] = value;
    }
    static async Execute(block) {
        let current = block;
        while (current !== null) {
            await current.Execute();
            current = current.Next;
        }
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
        this.io.Print(String.fromCharCode(this.Current));
    }
    async Read() {
        const input = await this.io.Read();
        this.Current = input.charCodeAt(0);
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
                    upcomingBlock = new FunctionalBlock(null, environment, async (context) => {
                        context.Next();
                    });
                    break;
                case Token.previous:
                    upcomingBlock = new FunctionalBlock(null, environment, async (context) => {
                        context.Previous();
                    });
                    break;
                case Token.add:
                    upcomingBlock = new FunctionalBlock(null, environment, async (context) => {
                        context.Add();
                    });
                    break;
                case Token.subtract:
                    upcomingBlock = new FunctionalBlock(null, environment, async (context) => {
                        context.Subtract();
                    });
                    break;
                case Token.print:
                    upcomingBlock = new FunctionalBlock(null, environment, async (context) => {
                        context.Print();
                    });
                    break;
                case Token.read:
                    upcomingBlock = new FunctionalBlock(null, environment, async (context) => {
                        await context.Read();
                    });
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
class StandardBroadcastChannel {
    constructor(messagePort) {
        this.messagePort = messagePort;
    }
    postMessage(type, data = undefined) {
        if (data) {
            this.messagePort.postMessage({ type: type, data: data });
        }
        else {
            this.messagePort.postMessage({ type: type });
        }
    }
}
class IOProxy {
    constructor(broadcastChannel) {
        this._broadcastChannel = broadcastChannel;
    }
    Print(value) {
        this._broadcastChannel.postMessage("print", value);
    }
    Read() {
        this._broadcastChannel.postMessage("reading");
        return new Promise((resolve, _reject) => {
            inputEventListeners.push((value) => {
                resolve(value);
            });
        });
    }
}
const inputEventListeners = [];
function execute(code, messagePort) {
    const broadcastChannel = new StandardBroadcastChannel(messagePort);
    const io = new IOProxy(broadcastChannel);
    const tokens = Interpreter.Tokenize(code, { ignoreUnknownCharacters: true });
    const environment = new TypescriptExecutionEnvironment({ allowNegativePointer: true, dynamicHeap: false }, io);
    const block = Interpreter.ExpressionTree(tokens, environment);
    broadcastChannel.postMessage("info", "running");
    const startTime = Date.now();
    TypescriptExecutionEnvironment.Execute(block);
    const endTime = Date.now();
    broadcastChannel.postMessage("info", `completed in: ${endTime - startTime} ms`);
}
this.addEventListener("message", (event) => {
    switch (event.data["type"]) {
        case "input":
            let currentEventListener = inputEventListeners.shift();
            while (currentEventListener) {
                currentEventListener(event.data["data"]);
                currentEventListener = inputEventListeners.shift();
            }
            break;
        case "run":
            execute(event.data["data"], event.currentTarget);
            break;
        default:
            console.error("unknown message type");
    }
});
//# sourceMappingURL=interpreter.js.map
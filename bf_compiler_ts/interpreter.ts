enum Token
{
	invalid,
	next,
	previous,
	add,
	subtract,
	print,
	read,
	cycleBegin,
	cycleEnd
}

abstract class Block
{
	protected next: Block | null;
	protected context: ExecutionEnvironment;

	public get Next(): Block | null
	{
		return this.next;
	}
	public set Next(value: Block | null)
	{
		this.next = value;
	}

	public abstract Execute(): Promise<void>;

	constructor(next: Block | null, context: ExecutionEnvironment)
	{
		this.next = next;
		this.context = context;
	}
}

class EmptyBlock extends Block
{
	public override async Execute(): Promise<void>
	{
		// do nothing
	}

	constructor(next: Block | null, context: ExecutionEnvironment)
	{
		super(next, context);
	}
}

class FunctionalBlock extends Block
{
	protected action: (context: ExecutionEnvironment) => Promise<void>;

	public override async Execute(): Promise<void>
	{
		await this.action(this.context);
	}

	constructor(next: Block | null, context: ExecutionEnvironment, action: (context: ExecutionEnvironment) => Promise<void>)
	{
		super(next, context);

		this.action = action;
	}
}

class CycleStartBlock extends Block
{
	protected cycleEnd: CycleEndBlock | null;

	public get CycleEnd(): CycleEndBlock | null
	{
		return this.cycleEnd;
	}
	public set CycleEnd(value: CycleEndBlock | null)
	{
		this.cycleEnd = value;
	}

	public override get Next(): Block | null
	{
		if (this.context.Current === 0)
		{
			return this.cycleEnd ? this.cycleEnd : null;
		}
		else
		{
			return this.next;
		}
	}
	public override set Next(value: Block | null)
	{
		this.next = value;
	}

	public override async Execute(): Promise<void>
	{
		// do nothing
	}

	constructor(next: Block | null, context: ExecutionEnvironment)
	{
		super(next, context);
		this.cycleEnd = null;
	}
}

class CycleEndBlock extends Block
{
	protected cycleStart: Block;

	public override get Next(): Block | null
	{
		if (this.context.Current !== 0)
		{
			return this.cycleStart;
		} else
		{
			return this.next;
		}
	}
	public override set Next(value: Block | null)
	{
		this.next = value;
	}

	public override async Execute(): Promise<void>
	{
		// do nothing
	}

	constructor(next: Block | null, context: ExecutionEnvironment, cycleStart: Block)
	{
		super(next, context);
		this.cycleStart = cycleStart;
	}
}

interface ExecutionEnvironment
{
	Current: number;

	Next(): void;
	Previous(): void;
	Add(): void;
	Subtract(): void;
	Print(): void;
	Read(): Promise<void>;
}

interface IO
{
	Print(value: string): void;
	Read(): Promise<string>;
}

interface ExecutionEnvironmentParameters
{
	dynamicHeap: boolean;
	allowNegativePointer: boolean;
}

class TypescriptExecutionEnvironment implements ExecutionEnvironment
{
	protected pointer: number;
	protected heap: Uint8Array;
	protected io: IO;
	protected parameters: ExecutionEnvironmentParameters;

	public get Current(): number
	{
		return this.heap[this.pointer]!;
	}
	public set Current(value: number)
	{
		this.heap[this.pointer] = value;
	}

	public static async Execute(block: Block): Promise<void>
	{
		let current: Block | null = block;

		while (current !== null)
		{
			await current.Execute();
			current = current.Next;
		}
	}

	public Next(): void
	{
		this.pointer++;

		if (this.pointer >= this.heap.length && this.parameters.dynamicHeap)
		{
			const copy = new Uint8Array(this.heap.length * 2);

			copy.set(this.heap);
			this.heap = copy;
		}
		else if (this.pointer >= this.heap.length)
		{
			throw new RangeError("Pointer is out of memory bounds");
		}
	}
	public Previous(): void
	{
		this.pointer--;

		if (this.pointer < 0 && this.parameters.allowNegativePointer)
		{
			this.pointer = this.heap.length - 1;
		} else if (this.pointer < 0)
		{
			throw new RangeError("Program pointer is out of memory bounds");
		}
	}
	public Add(): void
	{
		this.heap[this.pointer] += 1;
	}
	public Subtract(): void
	{
		this.heap[this.pointer] -= 1;
	}
	public Print(): void
	{
		this.io.Print(String.fromCharCode(this.Current));
	}
	public async Read(): Promise<void>
	{
		const input = await this.io.Read();

		this.Current = input.charCodeAt(0);
	}

	constructor(parameters: ExecutionEnvironmentParameters, terminal: IO)
	{
		this.pointer = 0;
		this.heap = new Uint8Array(30000);
		this.parameters = parameters;
		this.io = terminal;
	}
}

interface InterpretationParameters
{
	ignoreUnknownCharacters: boolean;
}

class Interpreter
{
	public static Tokenize(code: string, parameters: InterpretationParameters): Token[]
	{
		const tokens: Token[] = [];

		for (let index = 0; index < code.length; index++)
		{
			let currentToken: Token = Token.invalid;

			switch (code[index])
			{
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

			if (parameters.ignoreUnknownCharacters && currentToken === Token.invalid)
			{
				continue;
			}

			tokens.push(currentToken);
		}

		return tokens;
	}
	public static ExpressionTree(tokens: Token[], environment: ExecutionEnvironment): Block
	{
		const start: Block = new EmptyBlock(null, environment);
		let current: Block = start;
		const cycleStart: CycleStartBlock[] = [];

		for (let index = 0; index < tokens.length; index++)
		{
			let upcomingBlock: Block;

			switch (tokens[index])
			{
				case Token.next:
					upcomingBlock = new FunctionalBlock(null, environment, async (context: ExecutionEnvironment) =>
					{
						context.Next();
					});
					break;
				case Token.previous:
					upcomingBlock = new FunctionalBlock(null, environment, async (context: ExecutionEnvironment) =>
					{
						context.Previous();
					});
					break;
				case Token.add:
					upcomingBlock = new FunctionalBlock(null, environment, async (context: ExecutionEnvironment) =>
					{
						context.Add();
					});
					break;
				case Token.subtract:
					upcomingBlock = new FunctionalBlock(null, environment, async (context: ExecutionEnvironment) =>
					{
						context.Subtract();
					});
					break;
				case Token.print:
					upcomingBlock = new FunctionalBlock(null, environment, async (context: ExecutionEnvironment) =>
					{
						context.Print();
					});
					break;
				case Token.read:
					upcomingBlock = new FunctionalBlock(null, environment, async (context: ExecutionEnvironment) =>
					{
						await context.Read();
					});
					break;
				case Token.cycleBegin:
					const cycleBeginBlock: CycleStartBlock = new CycleStartBlock(null, environment);

					upcomingBlock = cycleBeginBlock;
					cycleStart.push(cycleBeginBlock);
					break;
				case Token.cycleEnd:
					if (cycleStart.length === 0)
					{
						throw new Error("Unmatched ]");
					} else
					{
						const cycleStartBlock: CycleStartBlock = cycleStart.pop()!;
						const cycleEndBlock: CycleEndBlock = new CycleEndBlock(null, environment, cycleStartBlock);

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

		if (cycleStart.length > 0)
		{
			throw new Error("Unmatched [");
		}

		return start;
	}
}

interface BroadcastChannelProxy
{
	postMessage(type: string, data?: any | undefined): void;
}

class StandardBroadcastChannel
{
	private messagePort: MessagePort;

	public postMessage(type: string, data: any | undefined = undefined): void
	{
		if (data)
		{
			this.messagePort.postMessage({ type: type, data: data });
		}
		else
		{
			this.messagePort.postMessage({ type: type });
		}
	}
	public constructor(messagePort: MessagePort)
	{
		this.messagePort = messagePort;
	}
}

class IOProxy implements IO
{
	private _broadcastChannel: BroadcastChannelProxy;

	public Print(value: string): void
	{
		this._broadcastChannel.postMessage("print", value);
	}
	public Read(): Promise<string>
	{
		this._broadcastChannel.postMessage("reading");

		return new Promise<string>((resolve, _reject) =>
		{
			inputEventListeners.push((value: string) =>
			{
				resolve(value);
			})
		})
	}

	public constructor(broadcastChannel: BroadcastChannelProxy)
	{
		this._broadcastChannel = broadcastChannel;
	}
}

const inputEventListeners: ((value: string) => void)[] = [];

function execute(code: string, messagePort: MessagePort)
{
	const broadcastChannel = new StandardBroadcastChannel(messagePort);
	const io = new IOProxy(broadcastChannel);

	const tokens = Interpreter.Tokenize(code, { ignoreUnknownCharacters: true });
	const environment = new TypescriptExecutionEnvironment({ allowNegativePointer: true, dynamicHeap: false }, io);
	const block = Interpreter.ExpressionTree(tokens, environment);

	broadcastChannel.postMessage("info", "running");

	TypescriptExecutionEnvironment.Execute(block);
}

this.addEventListener("message", (event) =>
{
	switch (event.data["type"])
	{
		case "input":
			let currentEventListener = inputEventListeners.shift();

			while (currentEventListener) 
			{
				currentEventListener(event.data["data"] as string);
				currentEventListener = inputEventListeners.shift();
			}
			break;
		case "run":
			execute(event.data["data"] as string, event.currentTarget as MessagePort); //deprected
			break;
		default:
			console.error("unknown message type");
	}
});
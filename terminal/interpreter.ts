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

class TypescriptExecutionEnvironment implements ExecutionEnvironment
{
	protected pointer: number;
	protected heap: Uint8Array;
	protected terminal: Terminal;
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
		this.terminal.writeKey(String.fromCharCode(this.Current));
	}
	public async Read(): Promise<void>
	{
		const input = await this.terminal.readKey();

		this.Current = input.charCodeAt(0);
	}

	constructor(parameters: ExecutionEnvironmentParameters, terminal: Terminal)
	{
		this.pointer = 0;
		this.heap = new Uint8Array(30000);
		this.parameters = parameters;
		this.terminal = terminal;
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

interface ExecutionEnvironmentParameters
{
	dynamicHeap: boolean;
	allowNegativePointer: boolean;
}


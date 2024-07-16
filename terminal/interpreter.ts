
//enum Token
//{
//	invalid,
//	next,
//	previous,
//	add,
//	subtract,
//	print,
//	read,
//	cycleBegin,
//	cycleEnd
//}

//abstract class Block
//{
//	protected next: Block | null;
//	protected context: ExecutionEnvironment;

//	public get Next(): Block | null
//	{
//		return this.next;
//	}
//	public set Next(value: Block | null)
//	{
//		this.next = value;
//	}

//	public abstract Execute(): void;

//	constructor(next: Block | null, context: ExecutionEnvironment)
//	{
//		this.next = next;
//		this.context = context;
//	}
//}

//class EmptyBlock extends Block
//{
//	public override Execute(): void
//	{
//		// do nothing
//	}

//	constructor(next: Block | null, context: ExecutionEnvironment)
//	{
//		super(next, context);
//	}
//}

//interface BlockFunction
//{
//	(context: ExecutionEnvironment): void;
//}

//class FunctionalBlock extends Block
//{
//	protected action: BlockFunction;

//	public override Execute(): void
//	{
//		this.action(this.context);
//	}

//	constructor(next: Block | null, context: ExecutionEnvironment, action: BlockFunction)
//	{
//		super(next, context);
//		this.action = action;
//	}
//}

//class ReadKeyBlock extends Block
//{
//	public override Execute(): void
//	{
//		this.action(this.context);
//	}

//	constructor(next: Block | null, context: ExecutionEnvironment, action: BlockFunction)
//	{
//		super(next, context);
//		this.action = action;
//	}
//}

//class CycleStartBlock extends Block
//{
//	protected cycleEnd: CycleEndBlock | null;

//	public get CycleEnd(): CycleEndBlock | null
//	{
//		return this.cycleEnd;
//	}
//	public set CycleEnd(value: CycleEndBlock | null)
//	{
//		this.cycleEnd = value;
//	}

//	public override get Next(): Block | null
//	{
//		if (this.context.Current === 0)
//		{
//			if (this.cycleEnd)
//			{
//				return this.cycleEnd;
//			}
//			return null;
//		}
//		else
//		{
//			return this.next;
//		}
//	}
//	public override set Next(value: Block | null)
//	{
//		this.next = value;
//	}

//	public override Execute(): void
//	{
//		// do nothing
//	}

//	constructor(next: Block | null, context: ExecutionEnvironment)
//	{
//		super(next, context);
//		this.cycleEnd = null;
//	}
//}

//class CycleEndBlock extends Block
//{
//	protected cycleStart: Block;

//	public override get Next(): Block | null
//	{
//		if (this.context.Current !== 0)
//		{
//			return this.cycleStart;
//		} else
//		{
//			return this.next;
//		}
//	}
//	public override set Next(value: Block | null)
//	{
//		this.next = value;
//	}
//	public override Execute(): void
//	{
//		// do nothing
//	}

//	constructor(next: Block | null, context: ExecutionEnvironment, cycleStart: Block)
//	{
//		super(next, context);
//		this.cycleStart = cycleStart;
//	}
//}

//interface ExecutionEnvironment
//{
//	Current: number;

//	Next(): void;
//	Previous(): void;
//	Add(): void;
//	Subtract(): void;
//	Print(): void;
//	Read(): void;
//}

//class TypescriptExecutionEnvironment implements ExecutionEnvironment
//{
//	protected pointer: number;
//	protected heap: number[];
//	protected terminal: Terminal;
//	protected parameters: ExecutionEnvironmentParameters;

//	public get Current(): number
//	{
//		return this.heap[this.pointer]!;
//	}
//	public set Current(value: number)
//	{
//		this.heap[this.pointer] = value;
//	}

//	public static Execute(block: Block): void
//	{
//		let current: Block | null = block;

//		while (current !== null)
//		{
//			current.Execute();
//			current = current.Next;
//		}
//	}

//	public Next(): void
//	{
//		this.pointer++;

//		if (this.pointer >= this.heap.length && this.parameters.dynamicHeap)
//		{
//			this.heap.push(0);
//		} else if (this.pointer >= this.heap.length)
//		{
//			throw new RangeError("Pointer is out of memory bounds");
//		}
//	}
//	public Previous(): void
//	{
//		this.pointer--;

//		if (this.pointer < 0 && this.parameters.allowNegativePointer)
//		{
//			this.pointer = this.heap.length - 1;
//		}
//		else if (this.pointer < 0)
//		{
//			throw new RangeError("Program pointer is out of memory bounds");
//		}
//	}
//	public Add(): void
//	{
//		this.Current++;
//	}
//	public Subtract(): void
//	{
//		this.Current--;
//	}
//	public Print(): void
//	{
//		this.terminal.writeKey(String.fromCharCode(this.Current));
//	}
//	public async Read(): Promise<void>
//	{
//		this.Current = (await this.terminal.readKey()).charCodeAt(0);
//	}

//	constructor(parameters: ExecutionEnvironmentParameters, terminal: Terminal)
//	{
//		this.heap = new Array(30000).fill(0);
//		this.parameters = parameters;
//		this.pointer = 0;
//		this.terminal = terminal;
//	}
//}

//interface InterpretationParameters
//{
//	ignoreUnknownCharacters: boolean;
//}

//class Interpreter
//{
//	public static Tokenize(code: string, parameters: InterpretationParameters): Token[]
//	{
//		const tokens: Token[] = [];

//		for (let index = 0; index < code.length; index++)
//		{
//			let currentToken: Token = Token.invalid;

//			switch (code[index])
//			{
//				case ">":
//					currentToken = Token.next;
//					break;
//				case "<":
//					currentToken = Token.previous;
//					break;
//				case "+":
//					currentToken = Token.add;
//					break;
//				case "-":
//					currentToken = Token.subtract;
//					break;
//				case ".":
//					currentToken = Token.print;
//					break;
//				case ",":
//					currentToken = Token.read;
//					break;
//				case "[":
//					currentToken = Token.cycleBegin;
//					break;
//				case "]":
//					currentToken = Token.cycleEnd;
//					break;
//			}

//			if (parameters.ignoreUnknownCharacters && currentToken === Token.invalid)
//			{
//				continue;
//			}

//			tokens.push(currentToken);
//		}

//		return tokens;
//	}

//	public static ExpressionTree(tokens: Token[], environment: ExecutionEnvironment): Block
//	{
//		const start: Block = new EmptyBlock(null, environment);
//		let current: Block = start;
//		const cycleStart: CycleStartBlock[] = [];

//		for (let index = 0; index < tokens.length; index++)
//		{
//			let upcomingBlock: Block;

//			switch (tokens[index])
//			{
//				case Token.next:
//					upcomingBlock = new FunctionalBlock(null, environment, (context: ExecutionEnvironment) =>
//					{
//						context.Next();
//					});
//					break;
//				case Token.previous:
//					upcomingBlock = new FunctionalBlock(null, environment, (context: ExecutionEnvironment) =>
//					{
//						context.Previous();
//					});
//					break;
//				case Token.add:
//					upcomingBlock = new FunctionalBlock(null, environment, (context: ExecutionEnvironment) =>
//					{
//						context.Add();
//					});
//					break;
//				case Token.subtract:
//					upcomingBlock = new FunctionalBlock(null, environment, (context: ExecutionEnvironment) =>
//					{
//						context.Subtract();
//					});
//					break;
//				case Token.print:
//					upcomingBlock = new FunctionalBlock(null, environment, (context: ExecutionEnvironment) =>
//					{
//						context.Print();
//					});
//					break;
//				case Token.read:
//					upcomingBlock = new FunctionalBlock(null, environment, async (context: ExecutionEnvironment) =>
//					{
//						await context.Read();
//					});
//					break;
//				case Token.cycleBegin:
//					const cycleBeginBlock: CycleStartBlock = new CycleStartBlock(null, environment);

//					upcomingBlock = cycleBeginBlock;
//					cycleStart.push(cycleBeginBlock);
//					break;
//				case Token.cycleEnd:
//					if (cycleStart.length === 0)
//					{
//						throw new Error("Unmatched ]");
//					} else
//					{
//						const cycleStartBlock: CycleStartBlock = cycleStart.pop()!;
//						const cycleEndBlock: CycleEndBlock = new CycleEndBlock(null, environment, cycleStartBlock);

//						upcomingBlock = cycleEndBlock;
//						cycleStartBlock.CycleEnd = cycleEndBlock;
//					}
//					break;
//				default:
//					throw new Error("Invalid token");
//			}

//			current.Next = upcomingBlock;
//			current = upcomingBlock;
//		}

//		if (cycleStart.length > 0)
//		{
//			throw new Error("Unmatched [");
//		}

//		return start;
//	}
//}

//interface ExecutionEnvironmentParameters
//{
//	dynamicHeap: boolean;
//	allowNegativePointer: boolean;
//}


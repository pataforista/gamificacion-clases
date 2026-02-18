import { DiceRoller, NumberGenerator } from 'rpg-dice-roller';
import { RNG } from '../utils/rng';
import './Dice.css';

const Dice = () => {
    const [result, setResult] = useState(null);
    const [detail, setDetail] = useState("");
    const [individualRolls, setIndividualRolls] = useState([]);
    const [isRolling, setIsRolling] = useState(false);
    const [diceType, setDiceType] = useState("6");
    const [diceCount, setDiceCount] = useState(1);
    const [diceMod, setDiceMod] = useState(0);
    const [formula, setFormula] = useState("");
    const cubeRefs = useRef([]);

    // Custom RNG to ensure high entropy results
    const customGen = new NumberGenerator();
    customGen.next = () => {
        // NumberGenerator.next expects a float [0, 1)
        const array = new Uint32Array(1);
        crypto.getRandomValues(array);
        return array[0] / (0xffffffff + 1);
    };
    const roller = new DiceRoller(customGen);

    const getRotation = (val) => {
        const rotations = {
            1: 'rotateX(0deg) rotateY(0deg)',
            2: 'rotateX(-180deg) rotateY(0deg)',
            3: 'rotateX(0deg) rotateY(-90deg)',
            4: 'rotateX(0deg) rotateY(90deg)',
            5: 'rotateX(-90deg) rotateY(0deg)',
            6: 'rotateX(90deg) rotateY(0deg)'
        };
        return rotations[val] || rotations[1];
    };

    const roll = () => {
        setIsRolling(true);
        setResult("...");
        setDetail("Lanzando dados...");
        setIndividualRolls([]);

        setTimeout(() => {
            const f = `${diceCount}d${diceType}${diceMod >= 0 ? "+" : ""}${diceMod}`;
            try {
                const rollResult = roller.roll(f);
                setResult(rollResult.total);
                setDetail(rollResult.toString());

                // Get individual dice results
                const rolls = rollResult.rolls[0].rolls.map(r => r.value);
                setIndividualRolls(rolls);

                setIsRolling(false);

                // Update rotations for d6 cubes
                if (diceType === "6") {
                    rolls.forEach((val, idx) => {
                        if (cubeRefs.current[idx]) {
                            cubeRefs.current[idx].style.transform = getRotation(val);
                        }
                    });
                }
            } catch (e) {
                setResult("Error");
                setDetail("Parámetros inválidos");
                setIsRolling(false);
            }

            if (navigator.vibrate) navigator.vibrate(15);
        }, 600);
    };

    const rollFormula = () => {
        if (!formula.trim()) return;
        setIsRolling(true);
        setResult("...");
        setIndividualRolls([]);

        setTimeout(() => {
            try {
                const rollResult = roller.roll(formula);
                setResult(rollResult.total);
                setDetail(rollResult.toString());

                // Try to extract individual rolls if possible
                if (rollResult.rolls && rollResult.rolls[0] && rollResult.rolls[0].rolls) {
                    setIndividualRolls(rollResult.rolls[0].rolls.map(r => r.value));

                    if (formula.toLowerCase().includes("d6") && !formula.includes("+") && !formula.includes("-")) {
                        // Attempt animation if it's a simple d6 roll
                        setTimeout(() => {
                            rollResult.rolls[0].rolls.forEach((r, idx) => {
                                if (cubeRefs.current[idx]) {
                                    cubeRefs.current[idx].style.transform = getRotation(r.value);
                                }
                            });
                        }, 50);
                    }
                }
            } catch (e) {
                setResult("Error");
                setDetail("Fórmula inválida");
            }
            setIsRolling(false);
            if (navigator.vibrate) navigator.vibrate(20);
        }, 600);
    };

    return (
        <div className="card">
            <h2>Mesa de Dados</h2>
            <div className="dice-tray" style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '20px',
                justifyContent: 'center',
                minHeight: diceType === "6" ? '160px' : '80px',
                padding: '20px'
            }}>
                {diceType === "6" ? (
                    // Show 3D cubes for d6
                    Array.from({ length: diceCount }).map((_, i) => (
                        <div key={i} className="scene" style={{ margin: '0' }}>
                            <div
                                ref={el => cubeRefs.current[i] = el}
                                className={`cube ${isRolling ? 'rolling' : ''}`}
                            >
                                <div className="face front">1</div>
                                <div className="face back">2</div>
                                <div className="face right">3</div>
                                <div className="face left">4</div>
                                <div className="face top">5</div>
                                <div className="face bottom">6</div>
                            </div>
                        </div>
                    ))
                ) : (
                    // Show numbers in stylized shapes for other dice
                    individualRolls.map((val, i) => (
                        <div key={i} className="dice-result-pill">
                            <span className="dice-shape">{diceType}</span>
                            <span className="dice-value">{val}</span>
                        </div>
                    ))
                )}
                {individualRolls.length === 0 && !isRolling && (
                    <div className="muted" style={{ opacity: 0.5 }}>Tira los dados para ver el resultado</div>
                )}
            </div>
            <div className="divider"></div>
            <div className="out">{result || "—"}</div>
            <div className="smallout">{detail}</div>

            <div className="divider"></div>

            <div className="row">
                <div>
                    <label>Tipo</label><br />
                    <select value={diceType} onChange={e => setDiceType(e.target.value)}>
                        <option value="4">d4</option>
                        <option value="6">d6</option>
                        <option value="8">d8</option>
                        <option value="10">d10</option>
                        <option value="12">d12</option>
                        <option value="20">d20</option>
                    </select>
                </div>
                <div>
                    <label>Cantidad</label><br />
                    <input type="number" min="1" value={diceCount} onChange={e => setDiceCount(parseInt(e.target.value))} />
                </div>
                <div>
                    <label>Mod (+/-)</label><br />
                    <input type="number" value={diceMod} onChange={e => setDiceMod(parseInt(e.target.value))} />
                </div>
            </div>

            <div className="row" style={{ marginTop: '15px' }}>
                <input
                    type="text"
                    placeholder="Fórmula (ej: 2d20 + 5)"
                    value={formula}
                    onChange={e => setFormula(e.target.value)}
                    style={{ flex: 1 }}
                />
                <button className="btn good" onClick={rollFormula}>Fórmula</button>
            </div>

            <div className="row" style={{ marginTop: '15px' }}>
                <button className="btn primary good" onClick={roll} disabled={isRolling}>Tirar</button>
                <button className="btn" onClick={() => { setDiceType("10"); setDiceCount(2); setDiceMod(0); }}>Dificultad (2d10)</button>
                <button className="btn" onClick={() => { setResult(null); setDetail(""); }}>Limpiar</button>
            </div>
        </div>
    );
};

export default Dice;

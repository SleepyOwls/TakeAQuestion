import { readFileSync } from "fs";
import * as path from "path";
import {Player} from "./Player";
import {GameServer} from "./Server";

type TakeQuestionOptions = {
    if_correct: SurpriseCardsActions,
    if_wrong: SurpriseCardsActions
}

type RollDieOptions = {
    if_bigger: { target: number, do: SurpriseCardsActions },
    if_smaller: { target: number, do: SurpriseCardsActions },
    if_equal: { target: number, do: SurpriseCardsActions }
}

type SurpriseCardType = 'luck' | 'bad_luck';

enum ExistingActions {
    ADVANCE= "ADVANCE",
    BACK = "BACK",
    ADVANCE_MULTIPLIER = "ADVANCE_MULTIPLIER",
    PASS = "PASS",
    TAKE_QUESTION = "TAKE_QUESTION",
    ROLL_DIE = "ROLL_DIE",
    OTHERS = "OTHERS",
    NEXT_ROUND = "NEXT_ROUND",
    CHOOSE_ENEMY = "CHOOSE_ENEMY"
}

abstract class Action<T extends ExistingActions> {
    private readonly _actionType: ExistingActions;
    private _card: SurpriseCard;
    private readonly _subActions: Action<any>[];
    private readonly _defaultArguments: ActionArguments[T];

    protected constructor(actionType: ExistingActions, subActions: Action<any>[] = [], defaultArguments: ActionArguments[T] = undefined) {
        this._actionType = actionType;
        this._subActions = subActions;
        this._defaultArguments = defaultArguments;
    }

    public abstract execute(arg: ActionArguments[T], callback: ActionCallbacks[T]): Promise<void>;

    get actionType() {
        return this._actionType;
    }

    get card() {
        return this._card;
    }

    get subActions() {
        return this._subActions;
    }

    get defaultArguments() {
        return this._defaultArguments;
    }

    set card(value) {
        this._card = value;
    }
}

class RollDieAction extends Action<ExistingActions.ROLL_DIE> {
    private readonly _ifBiggerActions: Action<any>[];
    private readonly _ifSmallerActions: Action<any>[];
    private readonly _ifEqualActions: Action<any>[];

    constructor(actionType: ExistingActions, ifBiggerActions: Action<any>[], ifSmallerActions: Action<any>[], ifEqualActions: Action<any>[], defaultArguments: ActionArguments[ExistingActions.ROLL_DIE]) {
        super(actionType, [], defaultArguments);

        this._ifBiggerActions = ifBiggerActions;
        this._ifSmallerActions = ifSmallerActions;
        this._ifEqualActions = ifEqualActions;
    }

    execute(info: ActionArguments[ExistingActions.ROLL_DIE], callbacks: ActionCallbacks[ExistingActions.ROLL_DIE]) {
        return new Promise<void>((resolve) => {
            let target = info.target;

            if(!target.ifSmallerTarget && this.defaultArguments.target.ifSmallerTarget) target.ifSmallerTarget = this.defaultArguments.target.ifSmallerTarget;
            if(!target.ifBiggerTarget && this.defaultArguments.target.ifBiggerTarget) target.ifBiggerTarget = this.defaultArguments.target.ifBiggerTarget;
            if(!target.ifEqualTarget && this.defaultArguments.target.ifEqualTarget) target.ifEqualTarget = this.defaultArguments.target.ifEqualTarget;

            let promises: Promise<void>[] = [];
            promises.push(this.card.cardManager.server.rollDie(info.playerId, (result) => {

                if(result > target.ifBiggerTarget) promises.push(callbacks.ifBigger(result));
                if(result < target.ifSmallerTarget) promises.push(callbacks.ifSmaller(result));
                if(result === target.ifEqualTarget) promises.push(callbacks.ifEqual(result));

                Promise.all(promises).then(() => resolve());
            }));
        });
    }

    get ifBiggerActions() {
        return this._ifBiggerActions;
    }

    get ifSmallerActions() {
        return this._ifSmallerActions;
    }

    get ifEqualActions() {
        return this._ifEqualActions;
    }
}

class OthersAction extends Action<ExistingActions.OTHERS> {
    constructor(actionType: ExistingActions, subActions: Action<any>[] = []) {
        super(actionType, subActions);
    }

    execute(selfPlayer: ActionArguments[ExistingActions.OTHERS], callback: ActionCallbacks[ExistingActions.OTHERS]) {
        return new Promise<void>((resolve) => {
            let targets: Player[] = [];

            let players = this.card.cardManager.server.getPlayers();
            for(let playerId in players) {
                let p = players[playerId];

                if(p.uuid !== selfPlayer.uuid) targets.push(p);
            }

            callback(targets).then(resolve);
        });
    }
}

class TakeQuestionAction extends Action<ExistingActions.TAKE_QUESTION> {
    private readonly _ifCorrectActions: Action<any>[];
    private readonly _ifWrongActions: Action<any>[];

    constructor(actionType: ExistingActions, ifCorrectActions: Action<any>[], ifWrongActions: Action<any>[]) {
        super(actionType, [], null);

        this._ifCorrectActions = ifCorrectActions;
        this._ifWrongActions = ifWrongActions;
    }

    execute(target: ActionArguments[ExistingActions.TAKE_QUESTION], callbacks: ActionCallbacks[ExistingActions.TAKE_QUESTION]) {
        return new Promise<void>((resolve) => {
            this.card.cardManager.server.makePlayerTakeQuestion(target).then((info) => {
                if(info.correct) callbacks.ifCorrect().then(resolve);
                else callbacks.ifWrong().then(resolve);
            });
        });
    }

    get ifCorrectActions() {
        return this._ifCorrectActions;
    }

    get ifWrongActions() {
        return this._ifWrongActions;
    }
}

class ChooseEnemyAction extends Action<ExistingActions.CHOOSE_ENEMY> {
    constructor(actionType: ExistingActions, subActions: Action<any>[] = []) {
        super(actionType, subActions);
    }

    execute(target: ActionArguments[ExistingActions.CHOOSE_ENEMY], callback: ActionCallbacks[ExistingActions.CHOOSE_ENEMY]) {
        return new Promise<void>((resolve) => {
            this.card.cardManager.server.makePlayerChoosePlayer(target).then((result) => {
                callback(result).then(resolve);
            });
        });
    }
}

class NextRoundAction extends Action<ExistingActions.NEXT_ROUND> {
    constructor(actionType: ExistingActions, subActions: Action<any>[] = []) {
        super(actionType, subActions);
    }

    execute(target: ActionArguments[ExistingActions.NEXT_ROUND], callback: ActionCallbacks[ExistingActions.NEXT_ROUND]) {
        return new Promise<void>((resolve) => {
            target.playerRoundCallback = () => {
                return new Promise<void>((resolve) => {
                    callback().then(resolve);
                    target.playerRoundCallback = () => { return new Promise<void>((resolve) => resolve()); };
                })
            }
            resolve();
        });
    }
}

class AdvanceAction extends Action<ExistingActions.ADVANCE> {
    constructor(actionType: ExistingActions, defaultArguments?: ActionArguments[ExistingActions.ADVANCE]) {
        super(actionType, [], defaultArguments);
    }

    execute(info: ActionArguments[ExistingActions.ADVANCE]) {
        return new Promise<void>((resolve) => {
            if(!info.amount && this.defaultArguments.amount) info.amount = this.defaultArguments.amount;

            console.log(`${info.targets.length} players passed as targets to advance action`);

            if(info.amount < 0) info.amount *= -1;
            for(let p of info.targets) {
                console.log(`moving ${p.playerName} ${info.amount} houses ahead`);
                p.move(info.amount);
            }
            resolve();
        });
    }
}

class BackAction extends Action<ExistingActions.BACK> {
    constructor(actionType: ExistingActions, defaultArguments?: ActionArguments[ExistingActions.BACK]) {
        super(actionType, [], defaultArguments);
    }

    execute(info: ActionArguments[ExistingActions.BACK]) {
        return new Promise<void>((resolve) => {
            if(!info.amount && this.defaultArguments.amount) info.amount = this.defaultArguments.amount;

            if(info.amount > 0) info.amount *= -1;
            for(let p of info.targets) {
                console.log(`moving ${p.playerName} ${info.amount} houses back`);
                p.move(info.amount);
            }
            resolve();
        });
    }
}

class AdvanceMultiplierAction extends Action<ExistingActions.ADVANCE_MULTIPLIER> {
    constructor(actionType: ExistingActions, defaultArguments?: ActionArguments[ExistingActions.ADVANCE_MULTIPLIER]) {
        super(actionType, [], defaultArguments);
    }

    execute(info: ActionArguments[ExistingActions.ADVANCE_MULTIPLIER]) {
        return new Promise<void>((resolve) => {
            if(!info.amount && this.defaultArguments.amount) info.amount = this.defaultArguments.amount;

            for(let p of info.targets) p.advanceMultiplier = info.amount;
            resolve();
        });
    }
}

class PassAction extends Action<ExistingActions.PASS> {
    constructor(actionType: ExistingActions, defaultArguments?: ActionArguments[ExistingActions.PASS]) {
        super(actionType, [], defaultArguments);
    }

    execute(info: ActionArguments[ExistingActions.PASS]) {
        return new Promise<void>((resolve) => {
            if(!info.do && this.defaultArguments.do) info.do = this.defaultArguments.do;

            for(let p of info.targets) p.pass = info.do;
            resolve();
        });
    }
}

class SurpriseCard {
    private readonly _surpriseCardType: SurpriseCardType;
    private readonly _text: string;
    private readonly _actions: Action<any>[];
    private readonly _cardManager: CardManager;

    constructor(surpriseCardType: SurpriseCardType, text: string, actions: Action<any>[], cardManager: CardManager) {
        this._surpriseCardType = surpriseCardType;
        this._text = text;
        this._actions = actions;
        this._cardManager = cardManager;

        for(let ac of this.actions) ac.card = this;
    }

    get type() {
        return this._surpriseCardType;
    }

    get text() {
        return this._text;
    }

    get actions() {
        return this._actions;
    }

    get cardManager() {
        return this._cardManager;
    }
}

class QuestionCard {
    private readonly _title: string;
    private readonly _question: string;
    private readonly _answer: string;
    private readonly _markSimilarAsCorrect: boolean;
    private readonly _correctIfCorrectAnswerIsOnUserAnswer: boolean;

    constructor(title: string, question: string, answer: string, markSimilarAsCorrect: boolean, correctIfCorrectAnswerIsOnUserAnswer: boolean) {
        this._title = title;
        this._question = question;
        this._answer = answer;
        this._markSimilarAsCorrect = markSimilarAsCorrect;
        this._correctIfCorrectAnswerIsOnUserAnswer = correctIfCorrectAnswerIsOnUserAnswer;
    }

    get title() {
        return this._title;
    }

    get question() {
        return this._question;
    }

    get answer() {
        return this._answer;
    }

    get doMarkSimilarAsCorrect() {
        return this._markSimilarAsCorrect;
    }

    get isCorrectIfCorrectAnswerIsOnUserAnswer() {
        return this._correctIfCorrectAnswerIsOnUserAnswer;
    }
}

class CardManager {
    private readonly _questionCards: QuestionCard[];
    private readonly _surpriseCards: SurpriseCard[];

    private readonly _timer: number;
    private readonly _useTimer: boolean;

    private readonly gameServer: GameServer;

    constructor(structure: CardFileStructure, server: GameServer) {
        this._timer = structure.timer;
        this._useTimer = structure.useTimer;

        this._questionCards = this.generateQuestionCards(structure.cards.questions);
        this._surpriseCards = this.generateSurpriseCards(structure.cards.surprise);

        this.gameServer = server;
    }

    private generateQuestionCards(cards: QuestionCardOptions[]) {
        let generatedCards: QuestionCard[] = [];

        for(let c of cards)
            generatedCards.push(new QuestionCard(
                c.title,
                c.question,
                c.answer,
                c.markSimilarAsCorrect,
                c.correctIfCorrectAnswerIsOnUserAnswer
            ));

        return generatedCards;
    }

    private generateSurpriseCards(cards: SurpriseCardOptions[]) {
        let generatedCards: SurpriseCard[] = [];

        let buildActionsForRollDie = (actions: RollDieOptions) => {
            let ifBiggerActions = actions.if_bigger ? buildActionsGeneral(actions.if_bigger.do) : [];
            let ifSmallerActions = actions.if_smaller ? buildActionsGeneral(actions.if_smaller.do) : [];
            let ifEqualActions = actions.if_equal ? buildActionsGeneral(actions.if_equal.do) : [];

            return new RollDieAction(ExistingActions.ROLL_DIE, ifBiggerActions, ifSmallerActions, ifEqualActions, { target: {
                ifEqualTarget: actions.if_equal?.target || 0,
                ifBiggerTarget: actions.if_bigger?.target || 0,
                ifSmallerTarget: actions.if_smaller?.target || 0
            }});
        }

        let buildActionsForTakeQuestion = (actions: TakeQuestionOptions) => {
            let ifCorrectActions = actions.if_correct ? buildActionsGeneral(actions.if_correct) : [];
            let ifWrongActions = actions.if_wrong ? buildActionsGeneral(actions.if_wrong) : [];

            return new TakeQuestionAction(ExistingActions.TAKE_QUESTION, ifCorrectActions, ifWrongActions);
        }

        let buildSimpleActions = (actions: SurpriseCardSimpleActions) => {
            let ac: Action<any>[] = [];

            if(actions.advance) ac.push(new AdvanceAction(ExistingActions.ADVANCE, { amount: actions.advance }));
            if(actions.back) ac.push(new BackAction(ExistingActions.BACK, { amount: actions.back }));
            if(actions.advance_multiplier) ac.push(new AdvanceMultiplierAction(ExistingActions.ADVANCE_MULTIPLIER, { amount: actions.advance_multiplier }));
            if(actions.pass) ac.push(new PassAction(ExistingActions.PASS, { do: actions.pass }));

            return ac;
        }

        let buildActionsGeneral = (actions: SurpriseCardsActions) => {
            let ac: Action<any>[] = [];

            if(actions.advance || actions.back || actions.advance_multiplier) ac.push(...buildSimpleActions({
                advance: actions.advance,
                back: actions.back,
                advance_multiplier: actions.advance_multiplier,
                pass: actions.pass
            }));

            if(actions.others) ac.push(new OthersAction(ExistingActions.OTHERS, buildSimpleActions(actions.others)));
            if(actions.next_round) ac.push(new NextRoundAction(ExistingActions.NEXT_ROUND, buildSimpleActions(actions.next_round)));
            if(actions.choose_enemy) ac.push(new ChooseEnemyAction(ExistingActions.CHOOSE_ENEMY, buildSimpleActions(actions.choose_enemy)));

            if(actions.take_question) ac.push(buildActionsForTakeQuestion(actions.take_question));
            if(actions.roll_die) ac.push(buildActionsForRollDie(actions.roll_die));

            return ac;
        }

        for(let card of cards) {
            let actions = buildActionsGeneral(card.actions);
            generatedCards.push(new SurpriseCard(card.type, card.text, actions, this));
        }

        return generatedCards;
    }

    get timer() {
        return this._timer;
    }

    get useTimer() {
        return this._useTimer;
    }

    get questionCards() {
        return this._questionCards;
    }

    get surpriseCards() {
        return this._surpriseCards;
    }

    get server() {
        return this.gameServer;
    }
}

class ActionExecutor {
    private readonly target: Player;

    constructor(target: Player) {
        this.target = target;
    }

    public execute(actions: Action<any>[], targets: Player[] = []) {
        return new Promise<void>((resolve) => {
            for(let ac of actions) {
                console.log(`Running action of type: ${ac.actionType}`);
                if(ac instanceof AdvanceAction) {
                    let a = ac as AdvanceAction;
                    a.execute({ targets: targets.length <= 0 ? [this.target] : targets }).then(resolve);
                    return;
                } else if(ac instanceof BackAction) {
                    let a = ac as BackAction;
                    a.execute({ targets: targets.length <= 0 ? [this.target] : targets }).then(resolve);
                    return;
                } else if(ac instanceof AdvanceMultiplierAction) {
                    let a = ac as AdvanceMultiplierAction;
                    a.execute({ targets: targets.length <= 0 ? [this.target] : targets }).then(resolve);
                    return;
                } else if(ac instanceof PassAction) {
                    let a = ac as PassAction;
                    a.execute({ targets: targets.length <= 0 ? [this.target] : targets }).then(resolve);
                    return;
                } else if(ac instanceof TakeQuestionAction) {
                    let a = ac as TakeQuestionAction;
                    a.execute(this.target, {
                        ifCorrect: () => { return new Promise<void>((resolve) => {
                                this.execute(a.ifCorrectActions).then(resolve);
                            }); },
                        ifWrong: () => { return new Promise<void>((resolve) => {
                           this.execute(a.ifWrongActions).then(resolve);
                        }); }
                    }).then(resolve);
                    return;
                } else if(ac instanceof ChooseEnemyAction) {
                    let a = ac as ChooseEnemyAction;
                    a.execute(this.target, (chosen) => {
                        return new Promise((resolve) => {
                           this.execute(a.subActions, [chosen]).then(resolve);
                        });
                    }).then(resolve);
                    return;
                } else if(ac instanceof RollDieAction) {
                    let a = ac as RollDieAction;
                    a.execute({ playerId: this.target.uuid }, {
                        ifBigger: () => {
                            return new Promise<void>((resolve) => {
                               this.execute(a.ifBiggerActions).then(resolve);
                            });
                        },
                        ifSmaller: () => {
                            return new Promise<void>((resolve) => {
                               this.execute(a.ifSmallerActions).then(resolve);
                            });
                        },
                        ifEqual: () => {
                            return new Promise<void>((resolve) => {
                               this.execute(a.ifEqualActions).then(resolve);
                            });
                        }
                    }).then(resolve);
                    return;
                } else if(ac instanceof NextRoundAction) {
                    let a = ac as NextRoundAction;
                    a.execute(this.target, () => {
                        return new Promise<void>((resolve) => {
                           this.execute(a.subActions).then(resolve);
                        });
                    }).then(resolve);
                    return;
                } else if(ac instanceof OthersAction) {
                    let a = ac as OthersAction;
                    a.execute(this.target, (players) => {
                        return new Promise<void>((resolve) => {
                            this.execute(a.subActions, players).then(resolve);
                        });
                    }).then(resolve);
                }
            }

            resolve();
        });
    }
}

class CardParser {
    public static parseCardFile(fileName: string) {
        let content = readFileSync(path.join(__dirname, "../../cards/", `${fileName}.json`)).toString("utf-8");
        let structure: CardFileStructure = JSON.parse(content);

        return structure;
    }
}

interface SurpriseCardSimpleActions {
    advance: number,
    back: number,
    advance_multiplier: number,
    pass: boolean
}

interface SurpriseCardsActions {
    advance: number,
    back: number,
    advance_multiplier: number,
    pass: boolean,
    take_question: TakeQuestionOptions,
    roll_die: RollDieOptions,
    choose_enemy: SurpriseCardSimpleActions,
    next_round: SurpriseCardSimpleActions,
    others: SurpriseCardSimpleActions
}

interface QuestionCardOptions {
    title: string,
    question: string,
    answer: string,
    markSimilarAsCorrect: boolean,
    correctIfCorrectAnswerIsOnUserAnswer: boolean
}

interface SurpriseCardOptions {
    type: SurpriseCardType,
    text: string,
    actions: SurpriseCardsActions
}

interface CardFileStructure {
    useTimer: boolean,
    timer: number,
    cards: {
        questions: QuestionCardOptions[],
        surprise: SurpriseCardOptions[]
    }
}

interface ActionCallbacks {
    ROLL_DIE?: { ifBigger?: (result: number) => Promise<void>, ifSmaller?: (result: number) => Promise<void>, ifEqual?: (result: number) => Promise<void> };
    CHOOSE_ENEMY?: (player: Player) => Promise<void>;
    TAKE_QUESTION?: { ifCorrect?: () => Promise<void>, ifWrong?: () => Promise<void> };
    NEXT_ROUND?: () => Promise<void>;
    ADVANCE?: () => void;
    OTHERS?: (targets: Player[]) => Promise<void>;
    BACK?: () => void;
    PASS?: () => void;
    ADVANCE_MULTIPLIER?: () => void;
}

interface ActionArguments {
    ROLL_DIE: { playerId?: string, target?: { ifBiggerTarget?: number, ifSmallerTarget?: number, ifEqualTarget?: number } };
    CHOOSE_ENEMY: Player;
    TAKE_QUESTION: Player;
    NEXT_ROUND: Player;
    OTHERS: Player;
    ADVANCE: { amount?: number, targets?: Player[] };
    BACK: { amount?: number, targets?: Player[] };
    ADVANCE_MULTIPLIER: { amount?: number, targets?: Player[] };
    PASS: { do?: boolean, targets?: Player[] };
}

export { CardManager, CardParser, ActionExecutor, SurpriseCardType }
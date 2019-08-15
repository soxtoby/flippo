import { constantEffect, Effect, effect, IAnimationConfig, interpolate, mapEffect, StyleProperty, StyleValues } from "./animation";
import { pick } from "./utils";

export interface Snapshot {
    rect: ClientRect;
    styles: StyleValues;
}

export function snapshot(element: HTMLElement, extraProperties: StyleProperty[] = ['opacity']): Snapshot {
    return {
        rect: element.getBoundingClientRect(),
        styles: pick(element.style, extraProperties)
    };
}

export interface ITransition {
    from: StyleValues;
    to: StyleValues;
    transforms: Effect<Translation | Scaling>[];
}

export interface IFlip extends ITransition {
    previous: Snapshot,
    current: Snapshot,
    translate: Effect<Translation>;
    scale: Effect<Scaling>;
}

export type Translation = { translateX: number, translateY: number };
export type Scaling = { scaleX: number, scaleY: number };

export function flip(previous: Snapshot, current: Snapshot, animationConfig: IAnimationConfig, parentFlip?: IFlip): IFlip {
    let undoParentTransforms = [] as Effect<Translation | Scaling>[];
    if (parentFlip) {
        let offsetX = parentFlip.current.rect.left - current.rect.left;
        let offsetY = parentFlip.current.rect.top - current.rect.top;

        let shiftToParentOrigin = constantEffect({ translateX: offsetX, translateY: offsetY });
        let undoParentScale = mapEffect(parentFlip.scale, reverseScaling);
        let undoParentTranslate = mapEffect(parentFlip.translate, reverseTranslation);
        let shiftToChildOrigin = mapEffect(shiftToParentOrigin, reverseTranslation);

        undoParentTransforms.push(shiftToParentOrigin, undoParentScale, undoParentTranslate, shiftToChildOrigin);
    }

    let scaleX = previous.rect.width / current.rect.width;
    let scaleY = previous.rect.height / current.rect.height;
    let scale = effect(
        interpolate({ scaleX, scaleY }, { scaleX: 1, scaleY: 1 }),
        animationConfig.durationMs,
        animationConfig.delayMs,
        animationConfig.timing);

    let translateX = previous.rect.left - current.rect.left;
    let translateY = previous.rect.top - current.rect.top;
    let translate = effect(
        interpolate({ translateX, translateY }, { translateX: 0, translateY: 0 }),
        animationConfig.durationMs,
        animationConfig.delayMs,
        animationConfig.timing);

    return {
        previous, current,
        translate, scale,
        transforms: [...undoParentTransforms, translate, scale],
        from: {
            transformOrigin: '0 0',
            ...previous.styles
        },
        to: {
            transformOrigin: '0 0',
            ...current.styles
        }
    };
}

function reverseScaling({ scaleX, scaleY }: Scaling) { return { scaleX: 1 / scaleX, scaleY: 1 / scaleY }; }
function reverseTranslation({ translateX, translateY }: Translation) { return { translateX: -translateX, translateY: -translateY }; }
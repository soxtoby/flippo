import { interpolate, interpolateMap, Interpolator, map, StyleProperty, StyleValues } from "./animation";

export interface Snapshot {
    rect: ClientRect;
    styles: StyleValues;
}

export function snapshot(element: HTMLElement, extraProperties: StyleProperty[] = ['opacity']): Snapshot {
    let styles = {} as StyleValues;
    if (extraProperties.length) {
        let elementStyles = getComputedStyle(element);
        extraProperties.forEach(prop => styles[prop] = elementStyles[prop]);
    }

    return {
        rect: element.getBoundingClientRect(),
        styles
    };
}

export interface ITransition {
    from: StyleValues;
    to: StyleValues;
    transforms: Interpolator<Translation | Scaling>[];
}

export interface IFlip extends ITransition {
    previous: Snapshot,
    current: Snapshot,
    translate: Interpolator<Translation>;
    scale: Interpolator<Scaling>;
}

export type Translation = { translateX: number, translateY: number };
export type Scaling = { scaleX: number, scaleY: number };

export function flip(previous: Snapshot, current: Snapshot, parentFlip?: IFlip): IFlip {
    let undoParentTransforms = [] as Interpolator<Translation | Scaling>[];
    if (parentFlip) {
        let offsetX = parentFlip.current.rect.left - current.rect.left;
        let offsetY = parentFlip.current.rect.top - current.rect.top;

        let shiftToParentOrigin = interpolateMap({ translateX: interpolate(offsetX, 0), translateY: interpolate(offsetY, 0) });
        let undoParentScale = map(parentFlip.scale, reverseScaling);
        let undoParentTranslate = map(parentFlip.translate, reverseTranslation);
        let shiftToChildOrigin = map(shiftToParentOrigin, reverseTranslation);

        undoParentTransforms.push(shiftToParentOrigin, undoParentScale, undoParentTranslate, shiftToChildOrigin);
    }

    let scaleX = previous.rect.width / current.rect.width;
    let scaleY = previous.rect.height / current.rect.height;
    let scale = interpolateMap({ scaleX: interpolate(scaleX, 1), scaleY: interpolate(scaleY, 1) });

    let translateX = previous.rect.left - current.rect.left;
    let translateY = previous.rect.top - current.rect.top;
    let translate = interpolateMap({ translateX: interpolate(translateX, 0), translateY: interpolate(translateY, 0) });

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
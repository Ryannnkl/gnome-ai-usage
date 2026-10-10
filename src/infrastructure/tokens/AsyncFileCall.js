import GLib from 'gi://GLib';

export function asyncFileCall(object, method, arguments_, cancellable) {
    return new Promise((resolve, reject) => {
        object[`${method}_async`](...arguments_, GLib.PRIORITY_DEFAULT, cancellable,
            (source, result) => {
                try {
                    resolve(source[`${method}_finish`](result));
                } catch (error) {
                    reject(error);
                }
            });
    });
}

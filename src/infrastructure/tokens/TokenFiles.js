import Gio from 'gi://Gio';
import {asyncFileCall} from './AsyncFileCall.js';
import {JsonLines} from './JsonLines.js';

export class TokenFiles {
    async *paths(root, suffix, cancellable, ledger, depth = 0) {
        if (depth > 32) {
            ledger.partial = true;
            return;
        }
        const folder = Gio.File.new_for_path(root);
        let iterator;
        try {
            iterator = await asyncFileCall(folder, 'enumerate_children',
                ['standard::name,standard::type', Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS], cancellable);
            while (true) {
                const batch = await asyncFileCall(iterator, 'next_files', [32], cancellable);
                if (!batch?.length)
                    break;
                for (const info of batch) {
                    cancellable.set_error_if_cancelled();
                    const path = folder.get_child(info.get_name()).get_path();
                    if (info.get_file_type() === Gio.FileType.DIRECTORY)
                        yield* this.paths(path, suffix, cancellable, ledger, depth + 1);
                    else if (info.get_file_type() === Gio.FileType.REGULAR && path.endsWith(suffix))
                        yield path;
                }
            }
        } catch (error) {
            cancellable.set_error_if_cancelled();
            if (!error.matches?.(Gio.io_error_quark(), Gio.IOErrorEnum.NOT_FOUND))
                ledger.partial = true;
        } finally {
            if (iterator)
                await asyncFileCall(iterator, 'close', [], null);
        }
    }

    async *events(path, cancellable, ledger) {
        let stream;
        try {
            stream = await asyncFileCall(Gio.File.new_for_path(path), 'read', [], cancellable);
            const parser = new JsonLines(ledger);
            while (true) {
                const bytes = await asyncFileCall(stream, 'read_bytes', [65536], cancellable);
                const end = bytes.get_size() === 0;
                yield* parser.push(bytes.get_data(), end);
                if (end)
                    break;
            }
        } catch {
            cancellable.set_error_if_cancelled();
            ledger.partial = true;
        } finally {
            if (stream)
                await asyncFileCall(stream, 'close', [], null);
        }
    }

}

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

export class JsonFileReader {
    read(path, cancellable) {
        const file = Gio.File.new_for_path(path);

        return new Promise((resolve, reject) => {
            file.load_contents_async(cancellable, (source, result) => {
                try {
                    const [, contents] = source.load_contents_finish(result);

                    if (contents.length > 1024 * 1024)
                        throw new Error('oversizedFile');

                    resolve(new TextDecoder().decode(contents));
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    fingerprint(value) {
        return GLib.compute_checksum_for_string(GLib.ChecksumType.SHA256, value, -1);
    }
}

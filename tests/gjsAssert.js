export function assert(condition, message) {
    if (!condition)
        throw new Error(message);
}

export async function rejects(action, code) {
    let caught;
    try {
        await action();
    } catch (error) {
        caught = error;
    }
    assert(caught?.code === code, `Expected ${code}, received ${caught?.code}`);
    return caught;
}

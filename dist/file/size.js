function size(size, units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']) {
    if (size == 0)
        return '0';
    const e = Math.floor(Math.log(size) / Math.log(1024));
    return (size / Math.pow(1024, Math.floor(e))).toFixed(2) + " " + units[e];
}

export { size };
//# sourceMappingURL=size.js.map

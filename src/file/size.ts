

export function size (size: number, units: string[] = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']): string {

    if(size == 0) return '0';

    const e: number = Math.floor(Math.log(size) / Math.log(1024));

    return (size / Math.pow(1024, Math.floor(e))).toFixed(2) + " " + units[e];
}
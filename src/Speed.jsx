export function Speed(base, run) {
    this.base = base;
    this.run = run;
}
Speed.prototype.toString = function() { return this.base + " (x" + this.run + ")";};
Speed.parse = function(speed) {
    if( speed instanceof Speed ) return speed;
    return new Speed(Number((speed+' ').split(/[ (x)/]+/)[0]),
        Number((speed+' ').split(/[ (x)/]+/)[1] || 4));
}
Speed.modifyBase = function(speedArg, multiplier) {
    const speed = Speed.parse(speedArg);
    return new Speed( Math.ceil(speed.base/5*multiplier)*5, speed.run);
}
Speed.reduceBase = function(speedArg) { return Speed.modifyBase(speedArg, 2/3); }
Speed.halfBase = function(speedArg) { return Speed.modifyBase(speedArg, 1/2); }
Speed.reduceRun = function(speedArg) {
    const speed = Speed.parse(speedArg);
    return new Speed( speed.base, speed.run-1 );
}
Speed.min = function(s1, s2) {
    return Speed.parse(s1).base <= Speed.parse(s2).base ? s1 : s2;
}

import "babel-polyfill";
import _ from 'lodash';
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { Glyphicon, Grid, Row, Col, Table, Form, Checkbox, FormGroup, FormControl, ControlLabel, ButtonToolbar, Button, ButtonGroup, DropdownButton, MenuItem, Navbar, Nav, NavDropdown, Panel } from 'react-bootstrap';
import { pure, compose, onlyUpdateForKeys  } from 'recompose';

const STATS = ['STR','DEX','CON', 'INT','WIS','CHA'];
const STAT_TYPES = ['base','enhance','misc','temp'];
const CLASSES = ['class1','class2','class3','class4','class5',
    'class6','class7','class8','class9','class10'];
const CLASS_TYPES = [ 'class', 'hd', 'hp', 'skill', 'bab', 'fort', 'refl', 'will', 'levels' ];
const WEAPONS = ['weapon0', 'weapon1','weapon2','weapon3','weapon4','weapon5',
    'weapon6','weapon7','weapon8','weapon9','weapon10',
    'weapon11','weapon12','weapon13','weapon14','weapon15',
    'weapon16','weapon17','weapon18','weapon19','weapon20'];
const SAVES = ['fort','refl','will'];
const SPELLCASTERS = ['sp0','sp1','sp2','sp3','sp4'];
const ARMOR_TYPES = ['Light','Medium','Heavy'];

class App extends Component {
    constructor(props) {
        super(props);
        this.prevChangeWasToKey = '';
        this.state = {stat:{ size:0 } };
        STATS.map( (stat) => {
            this.state.stat[stat] = { 'base': 10 };
        });
        this.default = {
            load: {
                light: {
                    "base-speed": "30 (x4)",
                    "max-dex": Infinity,
                    "skill-penalty": 0
                },
                medium: {
                    "base-speed": function(fn) {
                        return Speed.reduceBase(fn.getValue('load.light.base-speed')).toString();
                    },
                    "max-dex": 3,
                    "skill-penalty": 3
                },
                heavy: {
                    "base-speed": function(fn) {
                        return Speed.reduceRun(fn.getValue('load.medium.base-speed')).toString();
                    },
                    "max-dex": 1,
                    "skill-penalty": 6
                },
                lift: {
                    "base-speed": "5/round"
                }
            },
            armor: {
                light: {
                    "base-speed": function(fn) { return fn.getValue('load.light.base-speed'); }
                },
                medium: {
                    "base-speed": function(fn) {
                        return Speed.reduceBase(fn.getValue('armor.light.base-speed')).toString();
                    }
                },
                heavy: {
                    "base-speed": function(fn) {
                        return Speed.reduceRun(fn.getValue('armor.medium.base-speed')).toString();
                    }
                }
            },
            speed: {
                swim: function(fn) {
                    return Speed.halfBase( fn.getCurrentSpeed() ).base + "/round";
                },
                climb: function(fn) {
                    return Speed.halfBase( fn.getCurrentSpeed() ).base + "/round";
                }
            }
        }
        this.prevHistoryPushWasWithKey;
        this.isLoading = false;
        this.fn = {};
        this.fn.handleChange =  this.handleChange.bind(this);
        this.fn.getState = this.getState.bind(this);
        this.fn.getClassTypeTotal = this.getClassTypeTotal.bind(this);
        this.fn.getAbilityTotal = this.getAbilityTotal.bind(this);
        this.fn.getAbilityMod = this.getAbilityMod.bind(this);
        this.fn.getArmorLimitedDex = this.getArmorLimitedDex.bind(this);
        this.fn.getCurrentLoad = this.getCurrentLoad.bind(this);
        this.fn.getCurrentLoadName = this.getCurrentLoadName.bind(this);
        this.fn.getArmedLoad = this.getArmedLoad.bind(this);
        this.fn.getArmedLoadName = this.getArmedLoadName.bind(this);
        this.fn.getLoadLevels = this.getLoadLevels.bind(this);
        this.fn.getArmedSpeed = this.getArmedSpeed.bind(this);
        this.fn.getCurrentSpeed = this.getCurrentSpeed.bind(this);
        this.fn.getOverlandSpeed = this.getOverlandSpeed.bind(this);
        this.fn.getArmedSkillCheckPenalty = this.getArmedSkillCheckPenalty.bind(this);
        this.fn.getCurrentSkillCheckPenalty = this.getCurrentSkillCheckPenalty.bind(this);
        this.fn.getDefault = this.getDefault.bind(this);
        this.fn.getValue = this.getValue.bind(this);
        window.app = this; // for console debugging
    }

    componentDidUpdate(prevProps, prevState) {
        const title = this.getState(['info','character'])
            + '(lvl' + this.getClassTypeTotal('levels') + ') '
            + "v" + this.getState(['md','rev'],0)
            + " / " + this.getState(['md','prevChangeTime'],'');
        if( this.isLoading ) { // push no state while loading
            document.title = title;
            return;
        }
        let result = {};
        function recurse (cur, prop) {
            if ( cur === undefined ) {
                console.debug('componentDidUpdate: skipping undefined at', prop);
            } else if( typeof(cur) == 'function' ) {
                console.warn( 'componentDidUpdate: function at', prop);
            } else if (Object(cur) !== cur) {
                console.debug( 'componentDidUpdate saving:', prop, cur, typeof cur);
                result[prop] = cur;
            } else if( Array.isArray( cur ) ) {
                console.warn( 'componentDidUpdate: skipping array at', prop );
            } else {
                for (var p in cur) {
                    recurse(cur[p], prop ? prop+"."+p : p);
                }
            }
        }
        recurse(this.state, "");
        var qp = "";
        for (var k in result) {
            qp += "&" + k + "=" + encodeURIComponent( result[k] );
        }
        if ( ''+this.prevHistoryPushWasWithKey == ''+this.prevChangeWasToKey ) {
            console.debug('history.replaceState', title);
            history.replaceState(this.state , title, '?' + qp.slice(1).replace( /\%20/g, '+' ));
        } else {
            console.debug('history.pushState', title);
            history.pushState(this.state, title, '?' + qp.slice(1).replace( /\%20/g, '+' ));
            this.prevHistoryPushWasWithKey = this.prevChangeWasToKey;
        }
        document.title = title;
    }

    componentWillMount() {
        function convertKey(k) {
            if( STATS.indexOf( k.split('.')[0] )>-1 ) return 'stat.'+k;
            if( k == 'info.size' || k == 'size') return 'stat.size';
            if( k.indexOf('info') == 0 ) k = k.toLowerCase();
            if( k.indexOf('info.init') == 0 ) return k.replace('info.init', 'init');
            if( k.indexOf('info.speed') == 0 ) return k.replace('info.speed', 'speed');
            if( k.indexOf('acrobatic.') > 0 ) return k.replace('acrobatic.', 'acrobatics.');
            if( /refl*\./.test(k) ) return k.replace(/refl*\./, 'refl.');
            if( k == 'note.spell1' ) return "sp0.note";
            if( k.indexOf('spell1.') == 0 ) return k.replace('spell1.', 'sp0.');
            if( k.indexOf('speed.land') == 0 ) return "load.light.base-speed";
            return k;
        }
        function getQueryParams(qs) {
            qs = qs.split('+').join(' ');
            var params = {}, tokens, re = /[?&]?([^=]+)=([^&]*)/g;
            while (tokens = re.exec(qs)) {
                let key = decodeURIComponent(tokens[1]);
                let value = decodeURIComponent(tokens[2]);
                if( key.indexOf('prevChangeWasToKey')==0 ) continue;
                if( value == ({}).toString() ) continue;
                params[ convertKey( key ) ] = value;
            }
            return params;
        }
        const queryParams = getQueryParams(window.location.search);
        this.isLoading = true;
        if ( queryParams.state ) {
            // depracated old state format
            let s = JSON.parse( queryParams.state );
            console.info( 'componentWillMount: restoring state:', s );
            this.setState( s, restoreReady );
        } else {
            this.setState( (ps, pp) => {
                for( var k in queryParams ) {
                    this.setStateByKey( k.split('.'), queryParams[k] );
                }
            }, restoreReady );
        }
        function restoreReady() {
            console.info( 'componentWillMount: restored state:', this.state );
            this.prevChangeWasToKey = [""];
            this.componentDidUpdate( null, null );
            autoresizeAll();
            this.isLoading = false;
        }
    }

    popstateRestore(event) {
        console.log( 'popstate: restoring state', event.state, 'from', event );
        this.isLoading = true;
        this.setState( event.state, () => {
            console.debug('popstate: forcing update');
            this.forceUpdate( () => {
                this.isLoading = false;
                console.debug('popstate: restoring state complete:', this.state );
                autoresizeAll();
            });
        });
    }

    componentDidMount() {
        window.onpopstate = event => this.popstateRestore(event);
    }

    withPropKeyValue( prevState, propKey, newVal ) {
        newVal = (newVal == parseFloat(newVal).toString()) ? parseFloat(newVal) : newVal;
        newVal = newVal === 'false' ? false : newVal;
        const newState = {};
        let newLeaf = newState;
        let leaf = propKey.slice(0,-1).reduce(
            ( childState, key ) => {
                if( childState[key] === undefined ) {
                    return newLeaf = newLeaf[key] = {};
                }
                newLeaf = newLeaf[key] = {...childState[key]};
                return childState[key];
            }, prevState );
        const oldVal = leaf[propKey[propKey.length-1]];
        newLeaf[propKey[propKey.length-1]] = newVal;
        //console.debug('with', propKey, newState, 'was', oldVal);
        return newState;
    }
    setStateByKey( propKey, newVal ) {
        if( propKey.indexOf('.') > 0 )
            propKey = propKey.split('.');
        this.setState( (prevState, setProps) => {
            const newState = this.withPropKeyValue( prevState, propKey, newVal );
            if( !this.isLoading ) {
                newState.md = {
                    prevChangeTime : new Date().toLocaleString('sv-SV'),
                    rev : (prevState.md&&prevState.md.rev||0)+1
                };
            }
            this.prevChangeWasToKey = propKey;
            //console.log('setState', propKey, newVal, newState, 'of', prevState, setProps);
            return newState;
        } );
    }
    handleChange( propKey, mutator ) {
        return (e) => {
            if( mutator !== undefined ) {
                const oldVal = this.getState( propKey );
                const newVal = mutator( oldVal, e );
                console.debug('handleChange mutator:', propKey, newVal, oldVal, mutator);
                return this.setStateByKey( propKey, newVal);
            }
            const evval = e.target.type === 'checkbox' ? e.target.checked
                : e.target.value;
            const newVal =
                typeof(evval)==='boolean' ? evval || undefined :
                evval.length==0 ? undefined :
                evval;
            console.log('handleChange event', propKey, newVal, evval, e.target);
            this.setStateByKey( propKey, newVal );
        };
    }
    getState(propKey, defaultTo, type) {
        if( !type ) type = typeof defaultTo;
        if( type === 'number' ) {
            const stateVal = this.getState( propKey );
            if( undefined === defaultTo && undefined === stateVal ) return undefined;
            return Number( this.getState( propKey ) || defaultTo );
        }
        if( type === 'boolean' ) {
            return this.getState( propKey, 'false' ).toString() === 'true';
        }
        if( propKey.indexOf('.') > 0 )
            propKey = propKey.split('.');
        if( !Array.isArray(propKey) ) {
            throw new Error('propKey must be an array or dot-separated: ' + propKey);
        }
        const stateVal = propKey.reduce((tree, key) =>
            typeof tree == 'object' && key in tree ? tree[key] : undefined, this.state );
        return stateVal !== undefined ? stateVal : defaultTo;
    }
    getDefault(propKey) {
        if( propKey.indexOf('.') > 0 )
            propKey = propKey.split('.');
        const value = propKey.reduce((tree, key) =>
            typeof tree == 'object' && key in tree ? tree[key] : undefined, this.default );
        return typeof value == 'function' ? value(this.fn) : value;
    }

    getValue(propKey, defaultTo) {
        const stateVal = this.getState( propKey, undefined, typeof defaultTo)
        if( undefined !== stateVal ) return stateVal;
        const defaultVal = this.getDefault( propKey );
        if( undefined !== defaultVal ) return defaultVal;
        return defaultTo;
    }

    getClassTypeTotal(type) {
        return CLASSES.reduce( (sum, classN) =>
            ( sum+this.getState([classN,type],0)), 0)
    }
    getAbilityTotal(ability, skipTemp=false) {
        if (STATS.indexOf(ability) == -1) return NaN;
        const rageBonus = this.getState(['rage','enable']) && !skipTemp
            ? getRageState(this.fn)[ability] || 0 : 0;
        return STAT_TYPES.filter(x=>!skipTemp||x!=='temp').reduce(
            (sum,type) =>
            sum + this.getState(['stat',ability,type], 0), 0)
            +rageBonus;
    }
    getAbilityMod(ability, skipTemp) {
        return Math.round((this.getAbilityTotal(ability, skipTemp)-11)/2);
    }
    getArmorLimitedDex() {
        return Math.min(
            this.getAbilityMod('DEX'),
            this.getState(['armor','max-dex'], Infinity),
            this.getState(['shield','max-dex'], Infinity),
            this.getValue('load.'+this.getLoadName(this.getArmedLoad())+'.max-dex'));
    }
    getCurrentLoad() {
        return [...WEAPONS, 'armor', 'shield'].map( k => [k] )
            .concat( Object.keys( this.state.eq || {} ).map ( k => ['eq', k] ) )
            .reduce( (sum, key) => {
                const propKey = [...key, 'weight'];
                return sum + this.getState( propKey, 0 );
            }, 0);
    }
    getCurrentLoadName() {
        return this.getLoadName( this.getCurrentLoad() );
    }
    getArmedLoad() {
        return [...WEAPONS, 'armor', 'shield'].map( k => [k] )
            .reduce( (sum, key) => {
                const propKey = [...key, 'weight'];
                return sum + this.getState( propKey, 0 );
            }, 0);
    }
    getArmedLoadName() {
        return this.getLoadName( this.getArmedLoad() );
    }
    getLoadName( load ) {
        const loadLevels = this.getLoadLevels();
        const i=loadLevels.findIndex( function(loadLimit) { return load <= loadLimit; } );
        return ['light', 'medium', 'heavy', 'lift', 'drag', 'overloaded'][i];
    }
    getLoadLevels() {
        function baseMaxLoad(str) {
            if( str < 11 ) return 10*str;
            if( str > 14 ) return 2*baseMaxLoad(str-5);
            return [115, 130, 150, 175][str-11];
        }
        function sizeMultiplier(sizeMod, legs) {
            if( legs == 2) {
                if( sizeMod < 0 ) return -sizeMod*2;
                if( sizeMod == 0 ) return 1;
                if( sizeMod == 1 ) return 3/4;
                return 1/sizeMod;
            } else if( legs == 4 ) {
                if( sizeMod < 1 )
                    return sizeMultiplier(sizeMod,2)*3/2;
                if( sizeMod == 1 ) return 1;
                if( sizeMod == 2 ) return 3/4;
                return 2*sizeMultiplier(sizeMod,2);
            }
        }
        const maxLoad = Math.floor(
            baseMaxLoad( this.getAbilityTotal('STR') )
            * sizeMultiplier(this.getState(['stat','size']),
                this.getState(['stat','legs'],2)) );
        return [Math.floor(1/3*maxLoad),
            Math.floor(2/3*maxLoad), maxLoad, 2*maxLoad, 5*maxLoad, Infinity];
    }

    getArmedSpeed() {
        return Speed.min(
            this.getValue('armor.'+this.getState('armor.type', 'Light').toLowerCase()+'.base-speed'),
            this.getValue('load.'+this.getLoadName(this.getArmedLoad())+'.base-speed'));
    }

    getCurrentSpeed() {
        return Speed.min(
            this.getArmedSpeed(),
            this.getValue('load.'+this.getCurrentLoadName()+'.base-speed') );
    }

    getOverlandSpeed() {
        return Speed.parse(this.getCurrentSpeed()).base/10;
    }

    getArmedSkillCheckPenalty() {
        return Math.max(
            ( this.getState(['armor','skill-penalty'],0)
                + this.getState(['shield','skill-penalty'],0) ),
            this.getValue('load.'+this.getArmedLoadName()+'.skill-penalty', NaN) );
    }

    getCurrentSkillCheckPenalty() {
        return Math.max(
            this.getArmedSkillCheckPenalty(),
            this.getValue('load.'+this.getCurrentLoadName()+'.skill-penalty', NaN) );
    }

    render() {
        return (
            <Form>
                <AddfieldsNavbar {...this.fn} {...this.state} />
                <Grid fluid>
                    <InfoRow {...this.fn} {...this.state} />
                    <Row>
                        <Col md={5}>
                            <Row>
                                <Col xs={8} sm={9}>
                                    <AbilityTable {...this.fn} {...this.state} />
                                </Col>
                                <SizeField className="note-col" {...this.fn} {...this.state} sm={3} xs={4}/>
                                <Col xs={4} sm={3} className="note-col">
                                    <NoteArea {...this.fn} noteKey="ability" val={this.getState('note.ability')} />
                                </Col>
                            </Row>
                        </Col>
                        <Col md={7}>
                            <ClassTable {...this.fn} {...this.state} />
                        </Col>
                    </Row>
                    <Row>
                        <Col md={7}>
                            <Row>
                                <Col xs={7}>
                                    <InitTable {...this.fn} {...this.state}/>
                                    <ResistanceTable {...this.fn} {...this.state}/>
                                </Col>
                                <Col xs={5}>
                                    <HPTable {...this.fn} {...this.state}/>
                                </Col>
                            </Row>
                            <ACTable {...this.fn} {...this.state}/>
                            <Row>
                                <Col xs={8}>
                                    <SaveTable {...this.fn} {...this.state}/>
                                </Col>
                                <Col xs={4} className="note-col">
                                    <NoteArea {...this.fn} noteKey="save" val={this.getState('note.save')} />
                                </Col>
                            </Row>
                            <Row>
                                <Col xs={8}>
                                    <AttackTable {...this.fn} {...this.state} />
                                </Col>
                                <Col xs={4} className="note-col">
                                    <NoteArea {...this.fn} noteKey="attack" val={this.getState('note.attack')} />
                                </Col>
                            </Row>
                            <ArmorTable {...this.fn}/>
                        </Col>
                        <Col md={5}>
                            <SkillTable {...this.fn} {...this.state} />
                        </Col>
                        <Col xs={12}>
                            <WeaponTable {...this.fn} {...this.state}/>
                        </Col>
                    </Row>
                    <RagePanel {...this.fn} {...this.state} />
                    <Row>
                        <Col sm={12} md={6} className="note-col">
                            <NoteArea {...this.fn} noteKey="feat" val={this.getState('note.feat')} />
                        </Col>
                        <Col sm={12} md={6} className="note-col">
                            <NoteArea {...this.fn} noteKey="character" val={this.getState('note.character')} />
                        </Col>
                    </Row>
                    <Row>
                        <Col sm={12} md={6} className="note-col">
                            <NoteArea {...this.fn} noteKey="special" val={this.getState('note.special')} />
                        </Col>
                        <Col sm={12} md={6} className="note-col">
                            <NoteArea {...this.fn} noteKey="equipment" val={this.getState('note.equipment')} />
                        </Col>
                    </Row>
                    <EquipmentTable {...this.fn} {...this.state} />
                    <Row>
                        <Col sm={7}>
                            <SpeedTable {...this.fn} {...this.state} />
                            <NoteArea {...this.fn} {...this.state} placeholder="Speed and load notes" onerow
                                propKey={['load','note']} val={this.getState('load.note')}/>
                        </Col>
                        <Col sm={5}><LoadTable {...this.fn} {...this.state} /></Col>
                    </Row>
                    <SpellcasterPanels {...this.fn} {...this.state} />
                </Grid>
            </Form>
        );
    }
}

function ColText(props) {
    return (
        <Col bsClass="col" xs={props.xs || Math.min(props.sm*2, 12)} sm={props.sm}>
            <FormGroup validationState={props.validationState}>
                <ControlLabel>
                    <small>{props.label}</small>
                </ControlLabel>
                <FormControl.Static>
                    {props.children}
                </FormControl.Static>
            </FormGroup>
        </Col>
    );
}

function ColTextField(props) {
    const label = props.label || props.propKey[props.propKey.length-1];
    return (
        <Col bsClass="col" xs={props.xs || Math.min(props.sm*2, 12)} sm={props.sm}>
            <FormGroup validationState={props.validationState}
                controlId={props.propKey.join('-')} >
                <ControlLabel className="text-capitalize">
                    <small>{label}</small>
                </ControlLabel>
                <FormControl type="text"
                    value={props.getState(props.propKey,'')}
                    onChange={props.handleChange(props.propKey)}
                />
            </FormGroup>
        </Col>
    );
}

function SizeField(props) {
    const sizeValues = [8,4,2,1,0,-1,-2,-4,-8];
    const sizeOptions = ['Fine','Diminutive','Tiny','Small','Medium'
        ,'Large','Huge','Gargantuan','Colossal'].map( (sizeName,index) =>
        <option value={sizeValues[index]}>
            {sizeName+': '+sizeValues[index]}</option> );
    const statePropKey = ['stat', 'size'];
    return (
        <Col {...props} bsClass="col" xs={props.xs || Math.min(props.sm*2, 12)}>
            <FormGroup controlId={statePropKey.join('-')} bsSize="sm">
                <ControlLabel>
                    <small>Size</small>
                </ControlLabel>
                <FormControl componentClass="select"
                    value={props.getState(statePropKey)}
                    onChange={props.handleChange(statePropKey)}>
                    {sizeOptions}
                </FormControl>
            </FormGroup>
        </Col>
    );
}

const InfoRow = compose(
    onlyUpdateForKeys(['info','stat']), pure)(InfoRowImpl);
function InfoRowImpl(props) {
    return (
        <div>
            <Row>
                <ColTextField {...props} propKey={['info','character']} xs={7} sm={6}/>
                <ColTextField {...props} propKey={['info','player']} xs={3} sm={4}/>
                <ColText label="Minify" xs={2} sm={2}>
                    <Button
                        bsSize="sm" bsStyle="info" target="_blank"
                        href="javascript:void(location.href='http://tinyurl.com/create.php?url='+encodeURIComponent(location.href))">
                        tinyurl</Button>
                </ColText>
            </Row>
            <Row>
                <ColTextField {...props} propKey={['info','race']} sm={2}/>
                <ColTextField {...props} propKey={['info','gender']} sm={1}/>
                <ColTextField {...props} propKey={['info','height']} xs={3} sm={1}/>
                <ColTextField {...props} propKey={['info','weight']} xs={3} sm={1}/>
                <ColTextField {...props} propKey={['info','hair']} sm={2}/>
                <ColTextField {...props} propKey={['info','eyes']} sm={2}/>
                <ColTextField {...props} propKey={['info','skin']} sm={2}/>
                <ColTextField {...props} propKey={['info','age']} sm={1}/>
                <ColTextField {...props} propKey={['info','alignment']} sm={2}/>
                <ColTextField {...props} propKey={['info','deity']} sm={3}/>
                <ColTextField {...props} propKey={['info','homeland and occupation']} sm={7}/>
                <ColTextField {...props} propKey={['info','languages']} sm={12}/>
            </Row>
        </div>
    );
}

function StatRow(props) {
    const ability=props.ability;
    //console.log('row base for '+ability+':', props.getState(['stat',ability,'base']);
    const raging = props.getState(['rage','enable'],false);
    const rageBonus = raging ? getRageState(props)[ability] : 0;
    const abilityFields = STAT_TYPES.map( (type) =>
    <td><TextField {...props} propKey={['stat',ability,type]} /></td>
).concat( <td className={raging?"":"hidden"}>{rageBonus||""}</td>);
return (
    <tr>
        <th className="active">{ability}</th>
        <td>{props.getAbilityTotal(ability)}</td>
        <th className="success">{props.getAbilityMod(ability)}</th>
        {abilityFields}
    </tr>
);
}

const AbilityTable = compose(
    onlyUpdateForKeys(['stat','rage']), pure)(AbilityTableImpl);
function AbilityTableImpl(props) {
    const raging = props.getState(['rage','enable'],false);
    return (
        <Table condensed className="ability-table">
            <thead>
                <tr>
                    <th><small>Ability</small></th>
                    <th><small>Total</small></th>
                    <th><small>Mod</small></th>
                    <th className="ability-base"><small>Base</small></th>
                    <th><small>Enh<span className="hidden-xs hidden-md">ance</span></small></th>
                    <th><small>Misc</small></th>
                    <th><small>Temp</small></th>
                    <th className={raging?"":"hidden"}><small>Rage</small></th>
                </tr>
            </thead>
            <tbody>
                <StatRow {...props} ability="STR" />
                <StatRow {...props} ability="DEX" />
                <StatRow {...props} ability="CON" />
                <StatRow {...props} ability="INT" />
                <StatRow {...props} ability="WIS" />
                <StatRow {...props} ability="CHA" />
            </tbody>
        </Table>
    );
}

function TextField(props) {
    const placeholder = props.placeholder || props.getDefault( props.propKey );
    //console.debug(props.propKey, props.getState(props.propKey));
    return (
        <FormControl type="text"
            id={props.propKey.join('-')}
            value={props.getState(props.propKey, '')}
            onChange={props.handleChange(props.propKey)}
            placeholder={placeholder}
            className={props.className||''}
        />
    );
}

const NoteArea = pure(NoteAreaImpl);
function NoteAreaImpl(props) {
    const id = props.noteKey + '-note' || props.propKey.join('-');
    const propKey = props.propKey || ['note', props.noteKey];
    const role = props.noteKey || props.propKey[props.propKey.length-1];
    const className = [props.className
        ,"autoresize"
        ,propKey.join('-')
        ,props.onerow ? "onerow" : ""].join(' ');
    return (
        <FormGroup controlId={id}>
            <FormControl componentClass="textarea"
                inputRef={addAutoresize}
                className={className}
                value={props.getState(propKey,'')}
                onChange={props.handleChange(propKey)}
                placeholder={props.placeholder || role+" notes"} />
        </FormGroup>
    );
}

function NoPrintAbbr(props) {
    return (
        <span>
            <abbr className="hidden-print" title={props.title}>{props.children}</abbr>
            <span className="visible-print-block">{props.children}</span>
        </span>
    );
}

const ClassRow = pure(ClassRowImpl);
function ClassRowImpl(props) {
    const rowName = props.name;
    const classFields = CLASS_TYPES.map( (type) =>
    <td><TextField {...props} propKey={[rowName,type]} /></td>
);
return (
    <tr>
        {classFields}
    </tr>
);
}

const ClassTable = compose(
    onlyUpdateForKeys([...CLASSES]), pure)(ClassTableImpl);
function ClassTableImpl(props) {
    const classRows = CLASSES.map( function(classN,i) {
        if ( i>0 && isEmpty(props.getState(['class'+i]))
            && isEmpty(props.getState(['class'+(i+1)])) ) return null;
        return <ClassRow {...props} name={classN} val={props[classN]} />;
    } );
    return (
        <Table condensed>
            <thead>
                <tr>
                    <th className="class-name"><small>Classname</small></th>
                    <th><small>HD</small></th>
                    <th className="min-width-3-digits"><small>HP</small></th>
                    <th className="min-width-3-digits"><small>Skill</small></th>
                    <th><small>BAB</small></th>
                    <th><small>FORT</small></th>
                    <th><small>REF</small></th>
                    <th><small>WILL</small></th>
                    <th><small>Levels</small></th>
                </tr>
            </thead>
            <tbody>
                { classRows }
                <tr>
                    <th>Base totals</th>
                    <td></td>
                    <td>{props.getClassTypeTotal('hp')}</td>
                    <td>{props.getClassTypeTotal('skill')}</td>
                    <td>{props.getClassTypeTotal('bab')}</td>
                    <td>{props.getClassTypeTotal('fort')}</td>
                    <td>{props.getClassTypeTotal('refl')}</td>
                    <td>{props.getClassTypeTotal('will')}</td>
                    <td>{props.getClassTypeTotal('levels')}</td>
                </tr>
            </tbody>
        </Table>
    );
}

const HPTable = compose(
    onlyUpdateForKeys(['hp', 'stat', ...CLASSES, 'rage']), pure)(HPTableImpl);
function HPTableImpl(props) {
    const totalHP = props.getAbilityMod('CON')*props.getClassTypeTotal('levels')
        +props.getClassTypeTotal('hp');
    return (
        <Table condensed className="hp-table">
            <thead>
                <tr>
                    <th className="active"><small>HP (con*lvl+cls)</small></th>
                    <td>{totalHP}</td>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <th className="active hp-temporary">Temporary HP</th>
                    <td><TextField {...props} propKey={['hp','temp']} /></td>
                </tr>
                <tr>
                    <th className="active">Subdual dam</th>
                    <td><TextField {...props} propKey={['hp','subdual']} /></td>
                </tr>
                <tr>
                    <th className="active">Lethal dam</th>
                    <td><TextField {...props} propKey={['hp','lethal']} /></td>
                </tr>
                <tr>
                    <th className="active">Current HP</th>
                    <td className="success">{
                            totalHP
                            + props.getState(['hp','temp'], 0)
                            - props.getState(['hp','subdual'], 0)
                            - props.getState(['hp','lethal'], 0)
                    }</td>
            </tr>
        </tbody>
    </Table>
);
}

const InitTable = compose(
    onlyUpdateForKeys(['init', 'stat']), pure)(InitTableImpl);
function InitTableImpl(props) {
    const initTotal = props.getAbilityMod('DEX')
        + props.getState(['init','enh'],0)
        + props.getState(['init','misc'],0)
        + props.getState(['init','temp'],0);
    return (
        <Table condensed>
            <thead>
                <tr>
                    <th></th>
                    <th><small>Total</small></th>
                    <th><small>Base</small></th>
                    <th><small>Enhance</small></th>
                    <th><small>Misc</small></th>
                    <th><small>Temp</small></th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <th className="active">Init</th>
                    <th className="success">{initTotal}</th>
                    <td>{props.getAbilityMod('DEX')}</td>
                    <td><TextField {...props} propKey={['init','enh']} /></td>
                    <td><TextField {...props} propKey={['init','misc']} /></td>
                    <td><TextField {...props} propKey={['init','temp']} /></td>
                </tr>
            </tbody>
        </Table>
    );
}

const ResistanceTable = compose(
    onlyUpdateForKeys(['info']), pure)(ResistanceTableImpl);
function ResistanceTableImpl(props) {
    return (
        <Table condensed>
            <tbody>
                <tr>
                    <th className="active">DR</th>
                    <td><TextField {...props} propKey={['info','dr']} /></td>
                    <th className="active">SR</th>
                    <td><TextField {...props} propKey={['info','sr']} /></td>
                </tr>
                <tr>
                    <th className="active">Resists</th>
                    <td colSpan="3"><TextField {...props} propKey={['info','resists']} /></td>
                </tr>
            </tbody>
        </Table>
    );
}

function SpeedTable(props) {
    return (
        <div>
            <Table condensed>
                <thead>
                    <tr>
                        <th>Speed</th>
                        <th><small>combat equipped</small></th>
                        <th><small>all equipment</small></th>
                        <th><small>Overland mph</small></th>
                        <th><small>Misc note</small></th>
                        <th><small>Temp note</small></th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <th className="active">Land</th>
                        <td className="success">{props.getArmedSpeed()}</td>
                        <td className="info">{props.getCurrentSpeed()}</td>
                        <td>{props.getOverlandSpeed()}</td>
                        <td><TextField {...props} propKey={['speed','misc']} /></td>
                        <td><TextField {...props} propKey={['speed','temp']} /></td>
                    </tr>
                </tbody>
            </Table>
            <Table condensed>
                <tbody>
                    <tr>
                        <th className="active"><small>Swim</small></th>
                        <td><TextField {...props} propKey={['speed','swim']} /></td>
                        <th className="active"><small>Climb</small></th>
                        <td><TextField {...props} propKey={['speed','climb']} /></td>
                        <th className="active"><small>Fly</small></th>
                        <td><TextField {...props} propKey={['speed','fly']} /></td>
                        <th className="active"><small>Burrow</small></th>
                        <td><TextField {...props} propKey={['speed','burrow']} /></td>
                    </tr>
                </tbody>
            </Table>
        </div>
    );
}

const ACTable = compose(
    onlyUpdateForKeys(['stat','armor','shield','ac','rage']), pure)(ACTableImpl);
function ACTableImpl(props) {
    const raging = props.getState(['rage','enable'],false);
    const rageBonus = raging ? getRageState(props)['ac'] : 0;
    const flatFootDexPenalty = Math.min( 0, props.getArmorLimitedDex() );
    return (
        <Table condensed>
            <thead>
                <tr>
                    <th><small>Defence</small></th>
                    <th><small>Total</small></th>
                    <th className="hidden-xs"></th>
                    <th><small>Armor</small></th>
                    <th><small>Shield</small></th>
                    <th><small>Dex</small></th>
                    <th><small>Size</small></th>
                    <th><small>Dodge</small></th>
                    <th><small>Natural</small></th>
                    <th><small>Deflect</small></th>
                    <th><small>Misc</small></th>
                    <th><small>Temp</small></th>
                    <th className={raging?"":"hidden"}><small>Rage</small></th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <th className="active">AC</th>
                    <th className="success">
                        {10
                                +props.getState(['armor','ac'],0)
                                +props.getState(['shield','ac'],0)
                                +props.getArmorLimitedDex()
                                +props.getState(['stat','size'],0)
                                +props.getState(['ac','dodge'],0)
                                +props.getState(['ac','natural'],0)
                                +props.getState(['ac','deflect'],0)
                                +props.getState(['ac','ac-misc'],0)
                                +props.getState(['ac','temp'],0)
                                +rageBonus}
                            </th>
                            <td className="hidden-xs"><small>10+</small></td>
                            <td>{props.getState(['armor','ac'],'')}</td>
                            <td>{props.getState(['shield','ac'],'')}</td>
                            <td>{props.getArmorLimitedDex()}</td>
                            <td>{props.getState(['stat','size'],'')}</td>
                            <td><TextField {...props} propKey={['ac','dodge']} /></td>
                            <td><TextField {...props} propKey={['ac','natural']} /></td>
                            <td><TextField {...props} propKey={['ac','deflect']} /></td>
                            <td><TextField {...props} propKey={['ac','ac-misc']} /></td>
                            <td><TextField {...props} propKey={['ac','temp']} /></td>
                            <td className={raging?"":"hidden"}><small>{rageBonus}</small></td>
                        </tr>
                        <tr>
                            <th className="active">Touch</th>
                            <th className="success">
                                {10+props.getArmorLimitedDex()
                                        +props.getState(['stat','size'],0)
                                        +props.getState(['ac','dodge'],0)
                                        +props.getState(['ac','deflect'],0)
                                        +props.getState(['ac','touch-misc'],0)
                                        +props.getState(['ac','temp'],0)
                                        +rageBonus}
                                    </th>
                                    <td className="hidden-xs"><small>10+</small></td>
                                    <td>-</td>
                                    <td>-</td>
                                    <td>{props.getArmorLimitedDex()}</td>
                                    <td>{props.getState(['stat','size'],'')}</td>
                                    <td>{props.getState(['ac','dodge'],'')}</td>
                                    <td>-</td>
                                    <td>{props.getState(['ac','deflect'],'')}</td>
                                    <td><TextField {...props} propKey={['ac','touch-misc']} /></td>
                                    <td>{props.getState(['ac','temp'],'')}</td>
                                    <td className={raging?"":"hidden"}><small>{rageBonus}</small></td>
                                </tr>
                                <tr>
                                    <th className="active">Flat-foot</th>
                                    <th className="success">
                                        {10
                                                +props.getState(['armor','ac'],0)
                                                +props.getState(['shield','ac'],0)
                                                +props.getState(['stat','size'],0)
                                                +props.getState(['ac','natural'],0)
                                                +props.getState(['ac','deflect'],0)
                                                +props.getState(['ac','ff-misc'],0)
                                                +props.getState(['ac','temp'],0)
                                                +flatFootDexPenalty
                                                +rageBonus}
                                            </th>
                                            <td className="hidden-xs"><small>10+</small></td>
                                            <td>{props.getState(['armor','ac'],'')}</td>
                                            <td>{props.getState(['shield','ac'],'')}</td>
                                            <td>{flatFootDexPenalty}</td>
                                            <td>{props.getState(['stat','size'],'')}</td>
                                            <td>-</td>
                                            <td>{props.getState(['ac','natural'],'')}</td>
                                            <td>{props.getState(['ac','deflect'],'')}</td>
                                            <td><TextField {...props} propKey={['ac','ff-misc']} /></td>
                                            <td>{props.getState(['ac','temp'],'')}</td>
                                            <td className={raging?"":"hidden"}><small>{rageBonus}</small></td>
                                        </tr>
                                    </tbody>
                                </Table>
                            );
}

function SaveTableRow(props) {
    const raging = props.getState(['rage','enable'],false);
    const rageBonus = raging ? getRageState(props)[props.save] || 0 : 0;
    return (
        <tr>
            <th className="active line-height-1">{props.save.toUpperCase()}
                <small> ({props.ability})</small></th>
            <th className="success">{
                    props.getClassTypeTotal(props.save)
                    +props.getAbilityMod(props.ability)
                    +props.getState([props.save,'enhance'],0)
                    +props.getState([props.save,'misc'],0)
                    +props.getState([props.save,'temp'],0)
                    +rageBonus }</th>
                <td>{props.getClassTypeTotal(props.save)}</td>
                <td>{props.getAbilityMod(props.ability)}</td>
                <td><TextField {...props} propKey={[props.save,'enhance']}/></td>
                <td><TextField {...props} propKey={[props.save,'misc']}/></td>
                <td><TextField {...props} propKey={[props.save,'temp']}/></td>
                <td className={raging?"":"hidden"}><small>{rageBonus||""}</small></td>
            </tr>
        );
}

const SaveTable = compose(
    onlyUpdateForKeys([...SAVES,'stat',...CLASSES,'rage']), pure)(SaveTableImpl);
function SaveTableImpl(props) {
    const raging = props.getState(['rage','enable'],false);
    return (
        <Table condensed>
            <thead>
                <tr>
                    <th className="save-name">
                        <small>Save</small>
                    </th>
                    <th><small>Total</small></th>
                    <th><small><span className="hidden-xs">Class </span>base</small></th>
                    <th><small>Abil<span className="hidden-xs">ity</span></small></th>
                    <th><small>Enh<span className="hidden-xs">ance</span></small></th>
                    <th><small>Misc</small></th>
                    <th><small>Temp</small></th>
                    <th className={raging?"":"hidden"}><small>Rage</small></th>
                </tr>
            </thead>
            <tbody>
                <SaveTableRow {...props} save="fort" ability="CON"/>
                <SaveTableRow {...props} save="refl" ability="DEX"/>
                <SaveTableRow {...props} save="will" ability="WIS"/>
            </tbody>
        </Table>
    );
}

const AttackTable = compose(
    onlyUpdateForKeys([...CLASSES, 'stat','rage','melee','ranged','cmb','cmd']),
    pure )( AttackTableImpl );
function AttackTableImpl(props) {
    const strMod = props.getAbilityMod('STR');
    const dexMod = props.getAbilityMod('DEX');
    const sizeMod = props.getState(['stat','size'],0);
    const cmbAbilityMod = sizeMod < 2 ? strMod : dexMod;
    const attackRows = [
        {name: 'melee', ability: strMod, size: sizeMod}
        ,{name: 'ranged', ability: dexMod, size: sizeMod}
    ].map( attack =>
    <tr>
        <th className="active">{attack['name'].toUpperCase()}</th>
        <th className="success">
            { props.getClassTypeTotal('bab')
                    + attack['ability']
                    + attack['size']
                    + props.getState([attack['name'],'misc'],0)
                    + props.getState([attack['name'],'temp'],0)
            }</th>
        <td className="hidden-xs"></td>
        <td>{props.getClassTypeTotal('bab')}</td>
        <td>{attack['ability']}</td>
        <td>{attack['size']}</td>
        <td><TextField {...props} propKey={[attack['name'],'misc']}/></td>
        <td><TextField {...props} propKey={[attack['name'],'temp']}/></td>
    </tr>
);
return (
    <Table condensed>
        <thead>
            <tr>
                <th className="attack-name">
                    <small>Attack</small>
                </th>
                <th><small>Total</small></th>
                <th className="hidden-xs"></th>
                <th><small>BAB</small></th>
                <th><small>Abil<span className="hidden-xs">ity</span></small></th>
                <th><small>Size</small></th>
                <th><small>Misc</small></th>
                <th><small>Temp</small></th>
            </tr>
        </thead>
        <tbody>
            {attackRows}
            <tr>
                <th className="active">CMB</th>
                <th className="success">
                    {
                        props.getClassTypeTotal('bab')
                            + cmbAbilityMod
                            - sizeMod
                            + props.getState(['cmb','misc'],0)
                            + props.getState(['cmb','temp'],0)
                    }</th>
                <td className="hidden-xs"></td>
                <td>{props.getClassTypeTotal('bab')}</td>
                <td><NoPrintAbbr title="STR for small and larger, DEX for tiny and smaller. Use the misc modifier to adjust for the Agile Maneuvers feat.">{cmbAbilityMod}</NoPrintAbbr></td>
                <td><NoPrintAbbr title="*special* size modifier">{-sizeMod}</NoPrintAbbr></td>
                <td><TextField {...props} propKey={['cmb','misc']}/></td>
                <td><TextField {...props} propKey={['cmb','temp']}/></td>
            </tr>
            <tr>
                <th className="active">CMD</th>
                <th className="success">
                    { 10
                            + props.getClassTypeTotal('bab')
                            + strMod + dexMod
                            + props.getState(['ac','dodge'],0)
                            + props.getState(['ac','deflect'],0)
                            - sizeMod
                            + props.getState(['cmd','misc'],0)
                            + props.getState(['cmd','temp'],0)
                    }</th>
                <td className="hidden-xs"><small>10+</small></td>
                <td>{props.getClassTypeTotal('bab')}</td>
                <td><NoPrintAbbr title="STR+DEX+dodge+deflect">
                        {
                            strMod + dexMod
                            + props.getState(['ac','dodge'],0)
                                + props.getState(['ac','deflect'],0)
                        }</NoPrintAbbr></td>
                <td><NoPrintAbbr title="*special* size modifier">{-sizeMod}</NoPrintAbbr></td>
                <td><NoPrintAbbr title="Add here any insight, luck, morale, profane, and sacred bonuses to AC"><TextField {...props} propKey={['cmd','misc']}/></NoPrintAbbr></td>
                <td><TextField {...props} propKey={['cmd','temp']}/></td>
            </tr>
        </tbody>
    </Table>
);
}

function ArmorTable(props) {
    const armorKeys = ['ac','max-dex','skill-penalty',
        'spell-fail','weight'];
    const armorControls = armorKeys.map( (key) =>
    <td><TextField {...props} propKey={['armor',key]} /></td>
);
const shieldControls = armorKeys.map( (key) =>
<td><TextField {...props} propKey={['shield',key]} /></td>
    );
    return (
        <Table condensed className="armor-table">
            <thead>
                <tr>
                    <th></th>
                    <th className="armor-name">
                        <small>Armor name & description</small>
                    </th>
                    <th><small>AC Bonus</small></th>
                    <th><small>Max Dex</small></th>
                    <th><small>Check penalty</small></th>
                    <th><small>Spell fail</small></th>
                    <th><small>Weight</small></th>
                    <th><small>Type</small></th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <th className="active"><small>Armor</small></th>
                    <td><NoteArea {...props} propKey={['armor','desc']}
                        placeholder="armor note" onerow /></td>
                {armorControls}
                <td>
                    <SelectField {...props} propKey={['armor','type']} options={ARMOR_TYPES}
                        className="appearance-none"/>
                </td>
            </tr>
            <tr>
                <th className="active"><small>Shield</small></th>
                <td><NoteArea {...props} propKey={['shield','desc']}
                    placeholder="shield note" onerow /></td>
            {shieldControls}
        </tr>
    </tbody>
</Table>
    );
}

const WeaponTable = compose(
    onlyUpdateForKeys(WEAPONS), pure)(WeaponTableImpl);
function WeaponTableImpl(props) {
    const weaponKeys = ['bonus','dmg','crit',
        'range','type','weight'];
    let weaponRows = [];
    for( var i = 0; i<20; i++) {
        if ( i>0 && isEmpty( props.getState(['weapon'+(i-1)])) ) break;
        const cells = weaponKeys.map( (key) =>
        <td><TextField {...props} propKey={['weapon'+i,key]} /></td>
    );
        const row = <tr>
            <td><NoteArea {...props} propKey={['weapon'+i,'desc']}
                placeholder="name" onerow /></td>
        {cells}
        <td><NoteArea {...props} propKey={['weapon'+i,'note']}
            placeholder="notes" onerow /></td>
</tr>;
weaponRows = [...weaponRows,row];
    }
    return (
        <Table condensed className="weapon-table">
            <thead>
                <tr>
                    <th className="weapon-name">
                        <small>Weapon name & description</small>
                    </th>
                    <th className="weapon-bonus"><small>Attack bonus</small></th>
                    <th className="weapon-damage"><small>Damage</small></th>
                    <th className="weapon-critical"><small>Critical</small></th>
                    <th className="weapon-range"><small>Range</small></th>
                    <th className="weapon-type"><small>Type</small></th>
                    <th className="weapon-weight"><small>Weight</small></th>
                    <th><small>Notes & ammo</small></th>
                </tr>
            </thead>
            <tbody>
                {weaponRows}
            </tbody>
        </Table>
    );
}

function CheckboxField(props) {
    const {propKey, inline} = props;
    return (
        <FormGroup controlId={propKey.join('-')}>
            <Checkbox inline={inline}
                checked={props.getState(propKey)}
                onChange={props.handleChange(propKey)}>
                {props.children}
            </Checkbox>
        </FormGroup>
    );
}
function SelectField(props) {
    const {propKey, className, options} = props;
    const currVal = props.getState(propKey);
    const emptyOption = options.indexOf(currVal) > -1 ? "" : <option />
    const optionList = options.map( (option,index) =>
    <option value={option}>{option}</option> );
    return (
        <FormGroup controlId={propKey.join('-')} bsSize={props.bsSize||"sm"}>
            <FormControl componentClass="select"
                className={className}
                placeholder={props.getState(propKey)}
                value={props.getState(propKey)}
                onChange={props.handleChange(propKey)}>
                {emptyOption}
                {optionList}
            </FormControl>
        </FormGroup>
    );
}

const SKILL_AC_PENALTY_ABILITIES = ['STR','DEX'];
function CustomSkillRow(props) {
    const {propKey} = props;
    const abilityKey = [...propKey,'ability'];
    const ability = props.getState(abilityKey);
    const hasAcPenalty = SKILL_AC_PENALTY_ABILITIES.indexOf(ability) > -1;
    const nameField = <span>
        <TextField {...props} propKey={[...propKey,'categ']} />
        {hasAcPenalty ? "*" : ""}
    </span>;
    const abilityField = <SelectField {...props} propKey={abilityKey} options={STATS} />;
    const empty = isEmpty(props.getState([...propKey,'categ'],{}));
    return (<SkillRowBase {...props} nameField={nameField} ability={ability}
    abilityField={abilityField} hasAcPenalty={hasAcPenalty} empty={empty} />);
}
function SkillRow(props) {
    const {propKey,name,ability,hasCategory} = props;
    const hasAcPenalty = SKILL_AC_PENALTY_ABILITIES.indexOf(ability) > -1;
    const dispName = name + (hasCategory ? ': ': '');
    const categoryField = hasCategory
        ? <TextField {...props} propKey={[...propKey,'categ']}/>
        : "";
    const nameField = <span>{dispName}{categoryField}</span>;
    return (<SkillRowBase {...props} nameField={nameField} ability={ability}
    abilityField={ability} hasAcPenalty={hasAcPenalty} />);
}

function SkillRowBase(props) {
    const {propKey,nameField,ability,abilityField,hasAcPenalty,isUntrainedUse,empty} = props;
    const ranks = props.getState([...propKey,'ranks']);
    const isClass = props.getState([...propKey,'is-class']);
    return (<tr>
        <td className="skill-name">
            <CheckboxField {...props} inline propKey={[...propKey,'is-class']}>
                <small>{nameField}</small></CheckboxField></td>
        <td className="skill-ability"><small>{empty?'':abilityField}</small></td>
        <th className="success"><small>{
                    isUntrainedUse || ranks !== undefined ?
                    props.getState([...propKey,'ranks'],0)
                + props.getAbilityMod(ability)
                + (ranks>0 && isClass ? 3 : 0)
                + props.getState([...propKey,'misc'],0)
                + props.getState([...propKey,'temp'],0)
                - (hasAcPenalty ? props.getCurrentSkillCheckPenalty() : 0 )
                + (hasAcPenalty ? '*': '')
                : ""
        }</small></th>
<td><small><TextField {...props} propKey={[...propKey,'ranks']}/></small></td>
<td><small>{empty?'':props.getAbilityMod(ability)}</small></td>
<td><small>{ranks>0 && isClass ? 3 : 0}</small></td>
<td><small><TextField {...props} propKey={[...propKey,'misc']}/></small></td>
<td><small><TextField {...props} propKey={[...propKey,'temp']}/></small></td>
    </tr>);
}

const SkillTable = compose(
    onlyUpdateForKeys(['skill', 'stat', 'armor', 'shield', ...CLASSES, 'load', 'eq', ...WEAPONS]),
    pure)(SkillTableImpl);
function SkillTableImpl(props) {
    const SKILL_ABILITIES = ['DEX', 'INT', 'CHA', 'STR', 'INT', 'CHA',
        'DEX', 'CHA', 'DEX', 'DEX', 'CHA', 'WIS', 'CHA', 'INT', 'INT',
        'WIS', 'CHA', 'WIS', 'DEX', 'WIS', 'DEX', 'INT', 'DEX', 'WIS',
        'STR', 'CHA', ''];
    const SKILL_NAMES = ['Acrobatics', 'Appraise', 'Bluff', 'Climb',
        'Craft', 'Diplomacy', 'Disable Device', 'Disguise',
        'Escape Artist', 'Fly', 'Handle Animal', 'Heal', 'Intimidate',
        'Kn', 'Linguistics', 'Perception', 'Perf', 'Prof', 'Ride',
        'Sense Motive', 'Sleight of Hand', 'Spellcraft', 'Stealth',
        'Survival', 'Swim', 'Use Magic Device' ];
    const SKILLS_UNTRAINED_USE = [
        'Skill' ,'Acrobatics' ,'Appraise' ,'Bluff' ,'Climb' ,'Craft'
        ,'Diplomacy' ,'Disguise' ,'Escape Artist' ,'Fly' ,'Heal'
        ,'Intimidate' ,'Perception' ,'Perf' ,'Ride' ,'Sense Motive'
        ,'Stealth' ,'Survival' ,'Swim' ];
    const CATEGORY_SKILLS = ['Craft','Kn','Perf','Prof'];
    const skillRows = SKILL_NAMES.reduce( (rows, name, i) => {
        const hasCategory = CATEGORY_SKILLS.indexOf(name) > -1;
        const isUntrainedUse = SKILLS_UNTRAINED_USE.indexOf(name) > -1;
        if (!hasCategory) {
            rows=rows.concat(<SkillRow {...props} name={name}
            propKey={['skill',name.toLowerCase()]}
            isUntrainedUse={isUntrainedUse}
            ability={SKILL_ABILITIES[i]} hasCategory={hasCategory}/>);
            return rows;
        }
        for( let categoryIndex = 0; categoryIndex < 10; categoryIndex++ ) {
            const propKey = ['skill',name.toLowerCase()+categoryIndex];
            const prevKey = ['skill',name.toLowerCase()+(categoryIndex-1)];
            if( categoryIndex>0
                && isEmpty(props.getState(prevKey,{}))
                && isEmpty(props.getState(propKey,{})) ) {
                continue;
            }
            rows=rows.concat(<SkillRow {...props} name={name} propKey={propKey}
            isUntrainedUse={isUntrainedUse}
            ability={SKILL_ABILITIES[i]} hasCategory={hasCategory}/>);
        }
        return rows;
    }, []);
    let customSkillRows = [];
    for( let categoryIndex = 0; categoryIndex < 10; categoryIndex++ ) {
        const propKey = ['skill','custom'+categoryIndex];
        const prevKey = ['skill','custom'+(categoryIndex-1)];
        if( categoryIndex>0
            && isEmpty(props.getState([...prevKey,'categ'],{}))
            && isEmpty(props.getState(propKey,{})) ) {
            continue;
        }
        customSkillRows=customSkillRows.concat(
            <CustomSkillRow {...props} propKey={propKey} />);
    }
    const totalSkillRanks = props.getClassTypeTotal('skill');
    const assignedSkillRanks = props.skill &&
        Object.keys(props.skill).reduce( (sum, skill) =>
            ( sum+props.getState(['skill',skill,'ranks'],0)), 0);
    const unassignedSkillRanks = totalSkillRanks - assignedSkillRanks;
    const unassignedLabel = " (unused ranks "+unassignedSkillRanks+")";
    return (
        <Table striped condensed className="skill-table">
            <thead>
                <tr>
                    <th className="skill-name" colSpan={2}>
                        <small>Skill{unassignedLabel}</small>
                    </th>
                    <th><small>Total</small></th>
                    <th><small>Ranks</small></th>
                    <th><small>Abil</small></th>
                    <th><small>Trn.</small></th>
                    <th><small>Misc</small></th>
                    <th><small>Temp</small></th>
                </tr>
            </thead>
            <tbody>
                {skillRows}
                {customSkillRows}
            </tbody>
            <tfoot className="small">
                <tr>
                    <td colSpan={8}>
                        *: denotes that current skill check penalty is applied:
                        { props.getCurrentSkillCheckPenalty() }<br/>
                        (using a move action to drop your equipment would change it to:
                        { props.getArmedSkillCheckPenalty() })
                    </td>
                </tr>
            </tfoot>
        </Table>
    );
}

function getRageState(props) {
    const rageLevel = props.getState(['rage','level'])
    return rageLevel>19 ? {header:'Mighty Rage', STR: 8, CON: 8, will: 4, ac: -2} :
        rageLevel>10 ? {header:'Greater Rage', STR: 6, CON: 6, will: 3, ac: -2} :
        {header:'Rage', STR: 4, CON: 4, will: 2, ac: -2};
}

function EquipmentTable(props) {
    let equipmentRows = [];
    for( let i = 0; i < 50; i++ ) {
        const propKey = ['eq',''+i];
        const prevKey = ['eq',''+(i-1)];
        if( i>0 && isEmpty(props.getState(prevKey,{}))
            && isEmpty(props.getState(propKey,{})) ) {
            continue;
        }
        equipmentRows=equipmentRows.concat(
            <EquipmentRow {...props} propKey={propKey} />);
    }
    return (
        <Table condensed className="equipment-table">
            <thead>
                <tr>
                    <th className="equipment-name"><small>Equipment name & description</small></th>
                    <th><small>Value</small></th>
                    <th><small>Weight</small></th>
                </tr>
            </thead>
            <tbody>
                {equipmentRows}
            </tbody>
        </Table>
    );
}

function EquipmentRow(props) {
    const {propKey} = props;
    return (<tr>
        <td><small><NoteArea {...props} placeholder="name note" propKey={[...propKey,'name']} onerow/></small></td>
        <td><TextField {...props} propKey={[...propKey,'value']}/></td>
        <td><TextField {...props} propKey={[...propKey,'weight']}/></td>
    </tr>);
}

const RagePanel = compose(
    onlyUpdateForKeys(['rage', 'stat', 'note']),
    pure)(RagePanelImpl);
function RagePanelImpl(props) {
    if( !props.getState(['rage']) ) {
        return <span />;
    }
    const rageLevel = props.getState(['rage','level'])
    const rageRounds = 2 + 2 * rageLevel
        + props.getAbilityMod('CON',true)
        + props.getState(['rage','rounds','misc'],0)
        - props.getState(['rage','rounds','used'],0)
    const rageState = getRageState(props);
    const headerCheckbox =
    <CheckboxField {...props} inline propKey={['rage','enable']}>
        {rageState.header}
    </CheckboxField>;
    const validationRageEnabled = props.getState(['rage','enable'],false) ? "success" : "";
    // console.debug( 'validationRageEnabled', validationRageEnabled, props.getState(['rage','enable'],false) );
    return (
        <Panel header={headerCheckbox}>
            <Row>
                <Col sm={8}>
                    <Row>
                        <ColTextField {...props} label="Class levels" propKey={['rage','level']} xs={3} />
                        <ColTextField {...props} label="Misc rounds" propKey={['rage','rounds','misc']} xs={3} />
                        <ColTextField {...props} label="Used rounds" validationState="warning" propKey={['rage','rounds','used']} xs={3} />
                        <ColText label="Rounds of rage left" validationState="success" xs={3} >{rageRounds}</ColText>
                    </Row>
                    <Row>
                        <ColText label="STR bonus" validationState={validationRageEnabled} xs={3} >{rageState.STR}</ColText>
                        <ColText label="CON bonus" validationState={validationRageEnabled} xs={3} >{rageState.CON}</ColText>
                        <ColText label="Will bonus" validationState={validationRageEnabled} xs={3} >{rageState.will}</ColText>
                        <ColText label="AC penalty" validationState={validationRageEnabled} xs={3} >{rageState.ac}</ColText>
                    </Row>
                </Col>
                <Col sm={4}>
                    <NoteArea {...props} noteKey="rage" val={props.note.rage} />
                </Col>
            </Row>
        </Panel>
    );
}

function SpellcasterPanels(props) {
    const panels = SPELLCASTERS.map( function(k) {
        return <SpellTablePanel {...props} propKey={[k]}/>
        });
    return <div>{panels}</div>;
}

function SpellTablePanelHeader(props) {
    const {propKey} = props;
    return (
        <Table condensed className="spells-header-table">
            <thead>
                <tr className="middle">
                    <td>Spellcaster class:</td>
                    <td><TextField {...props} bsSize="sm" propKey={[...propKey,'className']}/></td>
                    <td>Level:</td>
                    <td><TextField {...props} bsSize="sm" propKey={[...propKey,'level']}/></td>
                    <td>Ability:</td>
                    <td><SelectField {...props} propKey={[...propKey,'ability']} options={STATS} /></td>
                </tr>
            </thead>
        </Table>
    );
}

const RANGES = [ 'personal', 'touch', 'close', 'medium', 'long' ];
function SpellTablePanelRow(props) {
    const {propKey,level,dcPlaceholder} = props;
    const prep = props.getState([...propKey, 'prep']);
    const used = props.getState([...propKey, 'used'], 0);
    const propsDC = { ...props, placeholder: dcPlaceholder };
    const prepCell = { className: prep>0?"success":"" };
    const usedCell = { className: prep<used?"danger":"warning" };
        return (
            <tr>
                <th className="active">{level}</th>
                <td><CheckboxField {...props} propKey={[...propKey,'SR']}/></td>
                <td><TextField {...propsDC} propKey={[...propKey,'dc']}/></td>
                <td><TextField {...props} propKey={[...propKey,'save']}/></td>
                <td {...prepCell}><TextField {...props} propKey={[...propKey,'prep']}/></td>
                <td {...usedCell}><TextField {...props} propKey={[...propKey,'used']}/></td>
                <td><NoteArea {...props} propKey={[...propKey,'name']}
                    placeholder="spell name & description" onerow/></td>
            <td><TextField {...props} propKey={[...propKey,'school']}/></td>
            <td><TextField {...props} propKey={[...propKey,'duration']}/></td>
            <td className="spell-range">
                <SelectField {...props} propKey={[...propKey,'range']} options={RANGES}
                    className="appearance-none"/>
            </td>
        </tr>
    );
}

function SpellTablePanel(props) {
    const {propKey} = props;
    if( !props.getState(propKey) ) {
        return null;
    }
    let spellTableRows = [];
    const abilityMod = props.getAbilityMod( props.getState([...propKey,'ability']), true );
    const rows = [0,1,2,3,4,5,6,7,8,9].map( function(lev) {
        if( lev>0 && props.getState([...propKey,'l'+(lev-1),'class']) === undefined ) return;
        const levelKey = [...propKey,'l'+lev];
        const hideLast = props.getState([...levelKey,'class']) === undefined?'hidden':'';
        const abilityBonus = lev==0 ? 0 : abilityMod;
        for( let i = 0; i<props.getState([...levelKey,'known'],0); i++ ) {
            if( i>0 && props.getState([...levelKey,String(i-1)]) === undefined
                && props.getState([...levelKey,String(i)]) === undefined
            ) continue;
            spellTableRows = [...spellTableRows, <SpellTablePanelRow {...props}
            dcPlaceholder={props.getState([...levelKey,'dc'],10+lev+abilityMod)}
            propKey={[...levelKey, String(i)]} level={lev} /> ]
    }
    const remainingSpells = props.getState([...levelKey,'class'])===undefined?"":
    abilityBonus - props.getState([...levelKey,'used'],0)
            + ['class','misc'].reduce( function(sum, key) {
                return sum + props.getState([...levelKey,key],0);
            }, 0);
        const remainingProps = { className: remainingSpells>0 ? "success" : "text-center" };
        const usedProps = { className:
        props.getState([...levelKey,'class'])===undefined ? "" :
        remainingSpells<0 ? "danger" : "warning" };
        return <tr>
            <th className="active">{lev}</th>
            <td><TextField {...props} className={hideLast}
                propKey={[...levelKey,'known']}/></td>
        <td><TextField {...props} className={hideLast} propKey={[...levelKey,'dc']}
            placeholder={10+lev+abilityMod} /></td>
    <th {...remainingProps}>{remainingSpells}</th>
    <td><TextField {...props} propKey={[...levelKey,'class']}/></td>
    <td>{hideLast?'':abilityBonus||''}</td>
    <td><TextField {...props} className={hideLast}
        propKey={[...levelKey,'misc']}/></td>
<td {...usedProps}><TextField {...props} className={hideLast}
    propKey={[...levelKey,'used']}/></td>
            </tr>
            });
    return (
        <Panel header={SpellTablePanelHeader({...props, propKey:propKey})}>
            <Row>
                <Col sm={6}>
                    <Table condensed className="spells-table">
                        <thead>
                            <tr>
                                <th><small>Spell Level</small></th>
                                <th><small>#Spells known</small></th>
                                <th><small>Save DC</small></th>
                                <th><small>Spells remaining</small></th>
                                <th><small>Class daily #</small></th>
                                <th><small>Ability bonus</small></th>
                                <th><small>Misc bonus</small></th>
                                <th><small>Used</small></th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows}
                        </tbody>
                    </Table>
                </Col>
                <Col sm={6}>
                    <Table condensed className="spellRange-table">
                        <thead>
                            <tr>
                                <td></td>
                                <td>Close</td>
                                <td>Medium</td>
                                <td>Long</td>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="active">Range (ft)</td>
                                <th className="success">
                                    {25+5*Math.floor(props.getState([...propKey,'level'])/2)}</th>
                                <th className="success">
                                    {100+10*props.getState([...propKey,'level'])}</th>
                                <th className="success">
                                    {400+40*props.getState([...propKey,'level'])}</th>
                            </tr>
                        </tbody>
                    </Table>
                    <NoteArea {...props} placeholder="Specialty, domain, familiar, etc. notes"
        propKey={[...propKey,'note']} val={props.getState([...propKey,'note'])} />
</Col>
            </Row>
            <Row>
                <Col xs={12}>
                    <Table condensed className="spell-list-table">
                        <thead>
                            <tr>
                                <th><small>Lvl</small></th>
                                <th><small>SR</small></th>
                                <th><small>DC</small></th>
                                <th><small>Save type</small></th>
                                <th><small>Prep</small></th>
                                <th><small>Used</small></th>
                                <th className="spell-name">
                                    <small>Spell name & description & ref</small></th>
                                <th><small>School</small></th>
                                <th><small>Duration</small></th>
                                <th><small>Range</small></th>
                            </tr>
                        </thead>
                        <tbody>
                            {spellTableRows}
                        </tbody>
                    </Table>
                </Col>
            </Row>
        </Panel>
    );
}

const AddfieldsNavbar = compose(
    onlyUpdateForKeys(['md','debug', 'react_perf']),
    pure)(AddfieldsNavbarImpl);
function AddfieldsNavbarImpl(props) {
    function clearTemp(e) {
        console.log( 'clearTemp' );
    }
    function clearTempSubdual(e) {
        clearTemp(e);
        console.log( 'clearSubdual' );
    }
    function clearUses(e) {
        console.log( 'clearUses' );
    }
    function clearUsesDamage(e) {
        clearUses(e);
        console.log( 'clearDamage' );
    }
    return (
        <Navbar fluid>
            <Navbar.Header>
                <Navbar.Brand>
                    { "Version: " + props.getState(['md','rev'],0) }
                </Navbar.Brand>
                <Navbar.Toggle />
            </Navbar.Header>
            <Navbar.Collapse>
                <Navbar.Text>
                    { "last change at: " + props.getState(['md','prevChangeTime'],'N/A') }
                </Navbar.Text>
                <Nav>
                    <NavDropdown title="TODO: Clear..." className="hidden">
                        <MenuItem onSelect={clearTemp}>Temporary bonuses</MenuItem>
                        <MenuItem onSelect={clearTempSubdual}>Temporary bonuses and subdual damage</MenuItem>
                        <MenuItem onSelect={clearUses}>Uses per day</MenuItem>
                        <MenuItem onSelect={clearUsesDamage}>Uses per day and all damage</MenuItem>
                    </NavDropdown>
                </Nav>
                <Nav>
                    <NavDropdown title="Add fields for...">
                        <MenuItem onSelect={props.handleChange(['rage'],Object)}>Rage</MenuItem>
                        <MenuItem onSelect={props.handleChange([SPELLCASTERS.find(
                            x=>!props[x] )],Object)}>Spellcaster class and spell list</MenuItem>
                        <MenuItem className="hidden">TODO:Spell like ability list</MenuItem>
                    </NavDropdown>
                </Nav>
                <Nav pullRight>
                    <NavDropdown pullRight title={<small>Debug</small>}>
                        <MenuItem onSelect={props.handleChange(['debug'],invert)}>
                            <Checkbox checked={props.getState(['debug'],false)}>
                                console debug
                            </Checkbox>
                        </MenuItem>
                        <MenuItem onSelect={props.handleChange(['react_perf'],invert)}>
                            <Checkbox checked={props.getState(['react_perf'],false)}>
                                react_perf
                            </Checkbox>
                        </MenuItem>
                    </NavDropdown>
                </Nav>
            </Navbar.Collapse>
        </Navbar>
    );
}

function LoadTable(props) {
    const loadLevels = props.getLoadLevels();
    const currentLoad = props.getCurrentLoad();
    function fullLoadClass(loadLevel) {
        const levels = [-1].concat(loadLevels);
        if( currentLoad > levels[3] && loadLevel < 3 ) return "danger"
        return levels[loadLevel] < currentLoad &&
            currentLoad <= levels[loadLevel+1] ? "info" : "";
    }
    const armedLoadName = props.getArmedLoadName();
    function loadClass(loadName) {
        return armedLoadName == loadName ? "success" : "";
    }
    function armorClass(armorLevel) {
        return ARMOR_TYPES[armorLevel] == props.getState('armor.type') ?
            "success" : "";
    }
    return (
        <Table condensed className="load-table small">
            <thead>
                <tr>
                    <th>Encumberance</th>
                    <td>Light</td>
                    <td>Medium</td>
                    <td>Heavy</td>
                    <td>Lift</td>
                    <td>Drag</td>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <th className="active">Current load: <strong>{currentLoad}</strong></th>
                    <td className={fullLoadClass(0)}>{loadLevels[0]}</td>
                    <td className={fullLoadClass(1)}>{loadLevels[1]}</td>
                    <td className={fullLoadClass(2)}>{loadLevels[2]}</td>
                    <td className={fullLoadClass(3)}>{loadLevels[2]*2}</td>
                    <td className={fullLoadClass(4)}>{loadLevels[2]*5}</td>
                </tr>
                <tr>
                    <th className="active">Combat load: <strong>{props.getArmedLoad()}</strong></th>
                    <td className={loadClass('light')}>{loadLevels[0]}</td>
                    <td className={loadClass('medium')}>{loadLevels[1]}</td>
                    <td className={loadClass('heavy')}>{loadLevels[2]}</td>
                    <td className={loadClass('lift')}>{loadLevels[2]*2}</td>
                    <td className={loadClass('drag')}>{loadLevels[2]*5}</td>
                </tr>
                <tr>
                    <th className="active">Max DEX to AC</th>
                    <td className={loadClass('light')}>-</td>
                    <td className={loadClass('medium')}>
                        <TextField {...props} propKey={['load','medium','max-dex']}
                            placeholder="3" className="width-2-digit" /></td>
                    <td className={loadClass('heavy')}>
                        <TextField {...props} propKey={['load','heavy','max-dex']}
                            placeholder="1" className="width-2-digit" /></td>
                    <td>
                        <TextField {...props} propKey={['load','stagger','max-dex']}
                            placeholder="0" className="width-2-digit" /></td>
                </tr>
                <tr>
                    <th className="active">Skill check penalty</th>
                    <td className={loadClass('light')}>0</td>
                    <td className={loadClass('medium')}>
                        <TextField {...props} propKey={['load','medium','skill-penalty']}
                            placeholder="3" className="width-2-digit" /></td>
                    <td className={loadClass('heavy')}>
                        <TextField {...props} propKey={['load','heavy','skill-penalty']}
                            placeholder="6" className="width-2-digit" /></td>
                    <td></td>
                </tr>
                <tr>
                    <th className="active">Base speed (run)</th>
                    <td className={loadClass('light')}>
                        <TextField {...props} propKey={['load','light','base-speed']}
                            className="width-5em" /></td>
                    <td className={loadClass('medium')}>
                        <TextField {...props} propKey={['load','medium','base-speed']}
                            className="width-5em" /></td>
                    <td className={loadClass('heavy')}>
                        <TextField {...props} propKey={['load','heavy','base-speed']}
                            className="width-5em" /></td>
                    <td className={loadClass('lift')}>
                        {props.getValue(['load','lift','base-speed'])}</td>
                </tr>
                <tr>
                    <th className="active">Speed with armor (run)</th>
                    <td className={armorClass(0)}>{props.getValue('load.light.base-speed')}</td>
                    <td className={armorClass(1)}>
                        <TextField {...props} propKey={['armor','medium','base-speed']}
                            className="width-5em" /></td>
                    <td className={armorClass(2)}>
                        <TextField {...props} propKey={['armor','heavy','base-speed']}
                            className="width-5em" /></td>
                </tr>
            </tbody>
        </Table>
    );
}

function invert(v) {
    return (!!v) ? undefined : true;
}

ReactDOM.render( <App />, document.getElementById('root'));


import React from 'react'
import {store} from './store.js'

class InferiorProgramInfo extends React.Component {

    constructor() {
        super()
        this.send_signal = this.send_signal.bind(this)
        this.get_choice = this.get_choice.bind(this)
        this.state = {inferior_pid: store._store.inferior_pid,
            selected_signal: 'SIGINT'}
        store.subscribe(this._store_change_callback.bind(this))
    }

    _store_change_callback(){
        this.setState({inferior_pid: store._store.inferior_pid,})
    }

    send_signal(){
        let signal_name = this.state.selected_signal
        , pid = this.state.inferior_pid

        $.ajax({
            url: "/send_signal_to_pid",
            cache: false,
            type: 'GET',
            data: {signal_name: signal_name, pid: pid},
            success: function(response){
                store.set('status', {text: response.message, error: false, warning: false})
            },
            error: function(response){
                if (response.responseJSON && response.responseJSON.message){
                    store.set('status', {'text': _.escape(response.responseJSON.message), 'error': true})
                }else{
                    store.set('status', {'text': `${response.statusText} (${response.status} error)`, 'error': true})
                }
                console.error(response)
            },
            complete: function(){
            }
        })
    }

    get_choice(s){
        let onclick = function(){
                        this.setState({'selected_signal': s})
                    }.bind(this)

        return <li key={s} className='pointer' value={s} onClick={onclick}>
                    <a >{`${s} (${this.props.signals[s]})`}</a>
                </li>
    }

    render(){

        if(this.state.inferior_pid){
                let signals = []
                for(let s in this.props.signals){
                    if(s === 'SIGKILL' || s === 'SIGINT'){
                        signals.push(this.get_choice(s))
                    }
                }
                for(let s in this.props.signals){
                    if(s !== 'SIGKILL' && s !== 'SIGINT'){
                        signals.push(this.get_choice(s))
                    }
                }
                return(
                    <div>
                        <span>inferior program: PID {this.state.inferior_pid}</span>
                        <div className="dropdown btn-group">

                            <button className="btn btn-default btn-xs dropdown-toggle" type="button" data-toggle="dropdown">{this.state.selected_signal}
                                <span className="caret"> </span>
                            </button>
                            <ul className="dropdown-menu">
                              {signals}
                            </ul>
                            <button className='btn btn-default btn-xs'
                                        id='step_instruction_button'
                                        type='button'
                                        title={`Send signal to pid ${this.state.inferior_pid}`}
                                        onClick={this.send_signal}
                                    >
                                        send to inferior
                            </button>
                        </div>


                    </div>)
        }else{
            return <span>no inferior program running</span>
        }
    }
}

export default InferiorProgramInfo

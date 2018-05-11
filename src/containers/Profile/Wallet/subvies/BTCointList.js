import React,{PureComponent} from 'react'

import {List,Button} from 'antd'
import BTFetch from '../../../../utils/BTFetch';
import messages from '../../../../locales/messages'
import {getAccount} from "../../../../tools/localStore";
import BTCointListCell from './BTCointListCell'

export default class BTAccountList extends PureComponent{
    constructor(props){
        super(props)
        this.state = {
            accoutList:[],
        }
    }
    componentDidMount(){
        this.getAccountList(this.props.selectWallet)
    }

    componentWillReceiveProps(nextProps){
        let selectWallet = nextProps.selectWallet;
        this.getAccountList(selectWallet)
    }

    getAccountList(selectWallet){
        let reqUrl = '/user/getAccount'
        let params = {
            username:selectWallet
        }

        BTFetch(reqUrl,'POST',params).then(response=>{
            if(response && response.code=="1"){
                let data = response.data;
                let accoutList = [
                    {
                        coinName:'BTO',
                        coinNum:data
                    }
                ]

                this.setState({
                    accoutList
                })
            }
        })
    }

    render(){
        // console.log(this.state.accoutList,this.props)
        return(
            <div className="container">
                <List
                    dataSource={this.state.accoutList}
                    style={{flex:1}}
                    renderItem={(item)=>{
                        let newItem = Object.assign(item,this.props)
                        return <BTCointListCell {...newItem}/>
                    }}
                />
            </div>
        )
    }
}

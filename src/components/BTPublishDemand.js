import React, {PureComponent} from 'react'
import { connect } from 'react-redux'
import moment from "moment"
import { Input, DatePicker, message, Button, Row, Col } from 'antd'
import BTAssetList from './BTAssetList'
import {getBlockInfo, getDataInfo, getSignaturedParam } from "../utils/BTCommonApi";
import BTFetch from "../utils/BTFetch";
import {FormattedMessage} from 'react-intl'
import messages from '../locales/messages'
import {getAccount} from '../tools/localStore'
import uuid from 'node-uuid'
import ConfirmButton from './ConfirmButton'
import BTTypeSelect from './BTTypeSelect'
import { toFixedWithoutZero } from '@/utils/number'
import {registDemandPack} from '../lib/msgpack/BTPackManager'
import {messageSign} from '../lib/sign/BTSign'
import BTCrypto from 'bottos-js-crypto'

const PersonalDemandMessages = messages.PersonalDemand;
const PersonalAssetMessages = messages.PersonalAsset;

const { TextArea } = Input;

String.prototype.trim=function() {
    return this.replace(/(^\s*)/g,'');
};
String.prototype.trims=function() {
    return this.replace(/(\s*$)/g,'');
};

const initialState = {
    title:"",
    textArea:"",
    number: 0,
    date:"",
    dateString: moment().add(7, 'days').toString(),
    newdata: [],
    getFileNameTemp:'',
    reqType: '00'
}

class BTPublishDemand extends PureComponent{
    constructor(props) {
        super(props)
        this.state = initialState
    }

    commitAsset(type){

      message.destroy()

      this.assetListModal.setState({
          visible:true,
          type:type,
      });

      BTFetch('/asset/queryUploadedData', 'post', {
        ...getSignaturedParam(getAccount()),
        pageSize: 10,
        pageNum: 1,
      }).then(res => {
        if (res.code == 1 && res.data.rowCount > 0) {
          this.setState({ newdata: res.data.row })
        } else {
          message.warning(window.localeInfo["Header.ThereIsNoFileResourceSetForTheTimeBeing"]);
        }
      }).catch(error => {
        message.warning(window.localeInfo["Header.FailedToGetTheFileResourceSet"]);
        console.error(error)
      })

    }

    getFileName(fileInfo){
        if(fileInfo.type=='asset'){
            this.setState({
                getFileName:fileInfo.value,
                storage_hash:fileInfo.hash,
                getRealUrl:fileInfo.getRealUrl,
            })
        }else if(fileInfo.type=='assetTemp'){
            this.setState({
                getFileNameTemp:fileInfo.value,
                sample_hash:fileInfo.hash,
                getExampleUrl:fileInfo.getExampleUrl,
            })
        }
    }

    onChangeTitle(e){
        this.setState({
            title:e.target.value.trim()
        })
    }

    handleNumberChange = (e) => {
        message.destroy();
        var number = e.target.value
        if (isNaN(number)) {
          return;
        }
        if (number >= 1e7) {
          number = 1e7 - 1
        }
        number = toFixedWithoutZero(number, 6)
        console.log('number', number);

        this.setState({number})
    };

    //datePicker
    onChangeDate = (date, dateString) => {
        this.setState({ date, dateString });
    }

    onChangeTextArea(e){
        this.setState({
            textArea:e.target.value.trim()
        })
    }

    async updata(){

      if (!this.state.title) {
          message.warning(window.localeInfo["PersonalDemand.PleaseImproveTheDemand"])
          return;
      }

      if (this.state.number <=0 || this.state.number >= 10000000000){
          message.warning(window.localeInfo["PersonalDemand.PleaseInputPrice"])
          return;
      }

      let blockInfo = await getBlockInfo()
      let account_info = this.props.account_info
      let privateKeyStr = account_info.privateKey
      let privateKey = Buffer.from(privateKeyStr,'hex')

      let params = {
        "version": 1,
        ...blockInfo,
        "sender": account_info.username,
        "contract": "datareqmng",
        "method": "datareqreg",
        "sig_alg": 1
      }

      let did = {
        "dataReqId": window.uuid,
        "basic_info": {
          "Username": account_info.username,
          "RequirementName": this.state.title || 'requirement',
          "RequirementType": Number.parseInt(this.state.reqType),
          "FeatureTag": 1,
          "SampleHash": this.state.getFileNameTemp || '',
          "ExpireTime": new Date(this.state.dateString).getTime() / 1000,
          "Price": this.state.number,
          "Description": this.state.textArea,
          "FavoriFlag": 1,
          "OpType": 1
        }
      }
      // console.log('did', did);

      let packBuf = registDemandPack(did)
      params.param = packBuf
      let sign = messageSign(params,privateKey)
      params.signature = sign.toString('hex')
      params.param = BTCrypto.buf2hex(packBuf)
      // console.log('params.param', params.param);

      let url = '/requirement/Publish'
      BTFetch(url,'POST',params)
      .then(response => {
        if (response && response.code == 1) {
          message.success(window.localeInfo["PersonalDemand.SuccessfulToPublishTheDemand"]);
        } else {
          message.warning(window.localeInfo["PersonalDemand.FailedToPublishTheDemand"]);
        }
      }).catch(error => {
        message.warning(window.localeInfo["PersonalDemand.FailedToPublishTheDemand"]);
      })
    }


    render() {
        return (
          <div className="upLoadNeed route-children-bg">
            <h2 className='route-children-container-title'>
              <FormattedMessage {...PersonalDemandMessages.PublishTheDemand} />
            </h2>

            <Row gutter={16}>
              <Col className='label' span={6}>
                <FormattedMessage {...PersonalDemandMessages.DemandName} />
              </Col>
              <Col span={8}>
                <Input value={this.state.title} onChange={(e)=>this.onChangeTitle(e)}  />
              </Col>
            </Row>


            <Row gutter={16}>
              <Col className='label' span={6}>
                <FormattedMessage {...PersonalDemandMessages.RecruitmentPrice}/>
              </Col>
              <Col span={8}>
                <Input
                  type='number'
                  defaultValue={0}
                  value={this.state.number}
                  onChange={this.handleNumberChange}
                />
              </Col>
              <Col span={4}>
                <img src="./img/token.png" style={{width:20,height:20,margin:5}} alt=""/>
              </Col>
            </Row>

            {/* 上传样例 */}
            <Row gutter={16}>
              <Col className='label' span={6}>
                <FormattedMessage {...PersonalAssetMessages.UploadTheSample}/>
              </Col>
              <Col span={18}>
                <Button type='primary'
                  examplefile={this.state.exampledata}
                  onClick={()=>this.commitAsset('assetTemp')}
                >
                  <FormattedMessage {...PersonalAssetMessages.SetScreeningSample}/>
                </Button>
                <span className='filename'>{
                    this.state.getFileNameTemp.length<=14
                    ?
                    this.state.getFileNameTemp
                    :
                    this.state.getFileNameTemp.split('.')[0].substring(0,5)+'...'+this.state.getFileNameTemp.split('.')[1]
                }</span>
              </Col>
            </Row>

            <BTAssetList ref={(ref) => this.assetListModal = ref}
              newdata={this.state.newdata}
              handleFile={(fileName)=>this.getFileName(fileName)}
            />

            <Row gutter={16}>
              <Col className='label' span={6}>
                <FormattedMessage {...PersonalAssetMessages.AssetType} />
              </Col>
              <Col span={12}>
                <BTTypeSelect onChange={(value)=>this.setState({reqType:value})}/>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col className='label' span={6}>
                <FormattedMessage {...PersonalDemandMessages.Deadline}/>
              </Col>
              <Col span={8}>
                <DatePicker
                  defaultValue={moment().add(7, 'days')}
                  placeholder={window.localeInfo["PersonalDemand.SelectDate"]}
                  onChange={this.onChangeDate}
                  disabledDate={(current) => current < moment().endOf('day')}
                  // showTime={{ defaultValue: moment('00:00:00', 'HH:mm:ss') }}
                />
              </Col>
            </Row>

            <Row gutter={16}>
              <Col className='label' span={6}>
                <FormattedMessage {...PersonalDemandMessages.DemandDescription}/>
              </Col>
              <Col span={12}>
                <TextArea maxLength='120' rows={4} value={this.state.textArea} onChange={(e)=>this.onChangeTextArea(e)} />
              </Col>
            </Row>

            <div className="uploadNeedSubmit marginTop">
              <ConfirmButton type="submit" onClick={(e)=>this.updata(e)}>
                <FormattedMessage {...PersonalDemandMessages.Publish}/>
              </ConfirmButton>
            </div>
          </div>
        )
    }
}


function mapStateToProps(state) {
  const account_info = state.headerState.account_info
  return { account_info }
}

export default connect(mapStateToProps)(BTPublishDemand)

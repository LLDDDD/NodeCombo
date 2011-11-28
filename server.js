/**
 * node������
 * @author ����
 * @email: donghan@taobao.com 
 */

/**
 * ����ϵͳģ��
 */
var http = require('http'),
	url = require('url'),
	fs = require('fs'),
	path = require('path');
/**
 * ��������������Զ���ģ��
 */
var Iconv = require('iconv').Iconv;
var buffer = require('buffer');
var httpProxy = require('http-proxy'),
	combo = require('./combo'),
	static = require('./static'),
	temp = require('./temp'),
	transfer = require('./transfer');

/**
 * ����node����Ľӿ�
 * @param port{number} ������˿�
 * @param host{string} ����
 * @memberOf server
 * @return void 
 */
exports.run = function(port,host){
	/**
	 * ����nodejs�Ķ�apache�����������80�˿ڷ���
	 * @hostnameOnly ����ʹ��host����
	 * @bj.ued.taobao.net@router  ����apache�Ķ˿ں���������
	 * @a.tbcdn.cn@router  ����a.tbcdn.cn(��nodejs�ṩ��web����) �˿�Ϊ8081
	 * ͨ���������ÿ�ͳһ����80�˿ڷ��ʸ��Ե�web����
	 */
	var options = {
		hostnameOnly: true,
		router: {
			//apache����
			 'bj.ued.taobao.net': '127.0.0.1:8080',
			 //node����
			 'assets.daily.taobao.net': '127.0.0.1:8081',
			 'a.tbcdn.cn': '127.0.0.1:8081'
		}
	}
	httpProxy.createServer(options).listen(port);
	http.createServer(function(req,res){
		//��ø�ʽ�����url����
		var parseUrl = url.parse(req.url);
		var fullpath  = path.join(__dirname,parseUrl.pathname),
			extnames = path.extname(fullpath),
			mime = static.contype[extnames.replace('.','')] || 'text/html;charset=gbk';
		//���assets.daily.taobao.net�ķ���
		if(req.headers.host == 'assets.daily.taobao.net'){
			res.writeHead(302,{
				'Location': 'http://a.tbcdn.cn' + req.url
			});	
			res.end();
			return;
		}
		//�����php�ļ����ض���apache��������
		if(extnames == '.php'){

			http.get({
				host: 'bj.ued.taobao.net',
				path: '/a.tbcdn.cn' + parseUrl.href
			},function(response){
				var buffers = [], size = 0;
				response.on('data', function(buffer) {
					buffers.push(buffer);
					size += buffer.length;
				});
				response.on('end', function() {
					var buffer = new Buffer(size), pos = 0;
					for(var i = 0, l = buffers.length; i < l; i++) {
						buffers[i].copy(buffer, pos);
						pos += buffers[i].length;
					}
					var gbk_to_utf8_iconv = new Iconv('GBK', 'UTF-8//TRANSLIT//IGNORE');
					var utf8_buffer = gbk_to_utf8_iconv.convert(buffer);
					res.writeHead(200,{
						'content-type': 'text/html;charset=utf-8'	
					})
					res.write(utf8_buffer.toString());
					res.end();
				});
			});
			return;
		}

		//�����jsģ��
		if(extnames == '.jst'){	
			temp.action(req,res,fullpath);	
			return;	
		}

		
		//�����combo����
		if(parseUrl.search && parseUrl.search.indexOf('??') == 0){
			combo.handlerCombo(parseUrl.pathname,parseUrl.search,req,res);
			return;
		}
		//�����Ŀ¼
		if(fullpath == '/home/a.tbcdn.cn/'){
			static.folder(res);	
			return;
		}
		//���Ӷ�-min�ļ���֧��
		if(!static.minexp.test(fullpath)){
			fullpath = fullpath.replace(/-min/gi,'');
		}	
		path.exists(fullpath,function(exsits){
			//������ش���
			if(exsits){
				//����Ǿ����ļ�
				if(extnames.length != 0){
					static.file(req,res,mime,fullpath);	
				}else{
					//�������ļ�Ŀ¼
					static.folder(res);	
				}
			}else{ 
				//������ز�����(����404�����ڴ˷�����ʵ��)
				transfer.fetch(req,res,mime,parseUrl.pathname);
			}	
		});
	}).listen(8081);	
};

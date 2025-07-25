import { expect } from 'chai';
import { config } from 'src/config.js';
import { spec } from 'modules/dspxBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { deepClone } from '../../../src/utils.js';
import {BANNER} from '../../../src/mediaTypes.js';

const ENDPOINT_URL = 'https://buyer.dspx.tv/request/';
const ENDPOINT_URL_DEV = 'https://dcbuyer.dspx.tv/request/';

describe('dspxAdapter', function () {
  const adapter = newBidder(spec);

  describe('isBidRequestValid', function () {
    const bid = {
      'bidder': 'dspx',
      'params': {
        'placement': '6682',
        'pfilter': {
          'floorprice': 1000000
        },
        'bcat': 'IAB2,IAB4',
        'dvt': 'desktop'
      },
      'sizes': [
        [300, 250]
      ],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475'
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      const invalidBid = {
        bidId: '30b31c1838de1e',
        bidder: 'dspx',
        mediaTypes: {
          [BANNER]: {
            sizes: [[300, 250]]
          }
        },
        params: {
          someIncorrectParam: 0
        }
      }
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    const bidRequests = [{
      'bidder': 'dspx',
      'params': {
        'placement': '6682',
        'pfilter': {
          'floorprice': 1000000,
          'private_auction': 0,
          'geo': {
            'country': 'DE'
          }
        },
        'bcat': 'IAB2,IAB4',
        'dvt': 'desktop'
      },
      'sizes': [
        [300, 250]
      ],
      'bidId': '30b31c1838de1e1',
      'bidderRequestId': '22edbae2733bf61',
      'auctionId': '1d1a030790a475',
      'adUnitCode': 'testDiv1',

      'userIdAsEids': [{
        'source': 'criteo.com',
        'uids': [{
          'id': 'criteo',
          'atype': 1
        }]
      }, {
        'source': 'pubcid.org',
        'uids': [{
          'id': 'pubcid',
          'atype': 1
        }]
      },
      {
        'source': 'netid.de',
        'uids': [{
          'id': 'netid',
          'atype': 1
        }]
      },
      {
        'source': 'uidapi.com',
        'uids': [{
          'id': 'uidapi',
          'atype': 1
        }]
      },
      {
        'source': 'sharedid.org',
        'uids': [{
          'id': 'sharedid',
          'atype': 1
        }]
      },
      {
        'source': 'adserver.org',
        'uids': [{
          'id': 'adserver',
          'atype': 1
        }]
      },
      {
        'source': 'pubmatic.com',
        'uids': [{
          'id': 'pubmatic',
          'atype': 1
        }]
      },
      {
        'source': 'yahoo.com',
        'uids': [{
          'id': 'yahoo',
          'atype': 1
        }]
      },
      {
        'source': 'utiq.com',
        'uids': [{
          'id': 'utiq',
          'atype': 1
        }]
      },
      {
        'source': 'euid.eu',
        'uids': [{
          'id': 'euid',
          'atype': 1
        }]
      },
      {
        'source': 'id5-sync.com',
        'uids': [
          {
            'id': 'ID5UID',
            'atype': 1,
            'ext': {
              'linkType': 2
            }
          }
        ]
      }, {
        source: "domain.com",
        uids: [{
          id: "1234",
          atype: 1,
          ext: {
            stype: "ppuid"
          }

        }]
      }
      ],
      'crumbs': {
        'pubcid': 'crumbs_pubcid'
      },
      'ortb2': {
        'source': {
          'ext': {
            'schain': {
              'ver': '1.0',
              'complete': 1,
              'nodes': [
                {
                  'asi': 'example.com',
                  'sid': '0',
                  'hp': 1,
                  'rid': 'bidrequestid',
                  'domain': 'example.com'
                }
              ]
            }
          }
        }
      }
    },
    { // 1
      'bidder': 'dspx',
      'params': {
        'placement': '101',
        'devMode': true
      },
      'sizes': [
        [300, 250]
      ],
      'bidId': '30b31c1838de1e2',
      'bidderRequestId': '22edbae2733bf62',
      'auctionId': '1d1a030790a476'
    }, { // 2
      'bidder': 'dspx',
      'params': {
        'placement': '6682',
        'pfilter': {
          'floorprice': 1000000,
          'private_auction': 0,
          'geo': {
            'country': 'DE'
          }
        },
        'bcat': 'IAB2,IAB4',
        'dvt': 'desktop'
      },
      'sizes': [
        [300, 250]
      ],
      'bidId': '30b31c1838de1e3',
      'bidderRequestId': '22edbae2733bf69',
      'auctionId': '1d1a030790a477',
      'adUnitCode': 'testDiv2'
    },
    { // 3
      'bidder': 'dspx',
      'params': {
        'placement': '101',
        'devMode': true
      },
      'mediaTypes': {
        'video': {
          'playerSize': [640, 480],
          'context': 'instream',
          'protocols': [1, 2],
          'playbackmethod': [2],
          'skip': 1
        },
        'banner': {
          'sizes': [
            [300, 250]
          ]
        }
      },

      'bidId': '30b31c1838de1e4',
      'bidderRequestId': '22edbae2733bf67',
      'auctionId': '1d1a030790a478',
      'adUnitCode': 'testDiv3'
    },
    { // 4
      'bidder': 'dspx',
      'params': {
        'placement': '101',
        'devMode': true,
        'vastFormat': 'vast4'
      },
      'mediaTypes': {
        'video': {
          'playerSize': [640, 480],
          'context': 'instream',
          'protocols': [1, 2],
          'playbackmethod': [2],
          'skip': 1,
          'renderer': {
            url: 'example.com/videoRenderer.js',
            render: function (bid) { alert('test'); }
          }
        }
      },
      'bidId': '30b31c1838de1e41',
      'bidderRequestId': '22edbae2733bf67',
      'auctionId': '1d1a030790a478',
      'adUnitCode': 'testDiv4'
    },
    { // 5
      'bidder': 'dspx',
      'params': {
        'placement': '101',
        'devMode': true,
        'dev': {
          'endpoint': 'http://localhost',
          'placement': '107',
          'pfilter': {'test': 1}
        }
      },
      'mediaTypes': {
        'video': {
          'playerSize': [640, 480],
          'context': 'instream',
          'mimes': ['video/mp4'],
          'protocols': [1, 2],
          'playbackmethod': [2],
          'skip': 1
        },
        'banner': {
          'sizes': [
            [300, 250]
          ]
        }
      },

      'bidId': '30b31c1838de1e4',
      'bidderRequestId': '22edbae2733bf67',
      'auctionId': '1d1a030790a478',
      'adUnitCode': 'testDiv3'
    },

    ];

    // With gdprConsent
    var bidderRequest = {
      refererInfo: {
        referer: 'some_referrer.net'
      },
      gdprConsent: {
        consentString: 'BOJ/P2HOJ/P2HABABMAAAAAZ+A==',
        vendorData: {someData: 'value'},
        gdprApplies: true
      }
    };

    // With ortb2
    var bidderRequestWithORTB = {
      refererInfo: {
        referer: 'some_referrer.net'
      },
      gdprConsent: {
        consentString: 'BOJ/P2HOJ/P2HABABMAAAAAZ+A==',
        vendorData: {someData: 'value'},
        gdprApplies: true
      },
      ortb2: {
        source: {},
        site: {
          domain: 'buyer',
          publisher: {
            domain: 'buyer'
          },
          page: 'http://buyer/schain.php?ver=8.5.0-pre:latest-dev-build&pbjs_debug=true',
          pagecat: ['IAB3'],
          ref: 'http://buyer/pbjsv/',
          content: {
            id: 'contentID',
            episode: 1,
            title: 'contentTitle',
            series: 'contentSeries',
            season: 'contentSeason 3',
            artist: 'contentArtist',
            genre: 'rock',
            isrc: 'contentIsrc',
            url: 'https://content-url.com/',
            context: 1,
            keywords: 'kw1,kw2,keqword 3',
            livestream: 0,
            cat: [
              'IAB1-1',
              'IAB1-2',
              'IAB2-10'
            ]
          }
        },
        bcat: ['BSW1', 'BSW2'],
      }
    };

    var request1 = spec.buildRequests([bidRequests[0]], bidderRequest)[0];
    it('sends bid request to our endpoint via GET', function () {
      expect(request1.method).to.equal('GET');
      expect(request1.url).to.equal(ENDPOINT_URL);
      const data = request1.data.replace(/rnd=\d+\&/g, '').replace(/ref=.*\&bid/g, 'bid').replace(/pbver=.*?&/g, 'pbver=test&');
      expect(data).to.equal('_f=auto&alternative=prebid_js&inventory_item_id=6682&srw=300&srh=250&idt=100&bid_id=30b31c1838de1e1&pbver=test&pfilter%5Bfloorprice%5D=1000000&pfilter%5Bprivate_auction%5D=0&pfilter%5Bgeo%5D%5Bcountry%5D=DE&pfilter%5Bgdpr_consent%5D=BOJ%2FP2HOJ%2FP2HABABMAAAAAZ%2BA%3D%3D&pfilter%5Bgdpr%5D=true&bcat=IAB2%2CIAB4&dvt=desktop&auctionId=1d1a030790a475&pbcode=testDiv1&media_types%5Bbanner%5D=300x250&schain=1.0%2C1!example.com%2C0%2C1%2Cbidrequestid%2C%2Cexample.com&did_cruid=criteo&did_ppuid=1%3Adomain.com%3A1234&did_pubcid=pubcid&did_netid=netid&did_uid2=uidapi&did_sharedid=sharedid&did_tdid=adserver&did_pbmid=pubmatic&did_yhid=yahoo&did_uqid=utiq&did_euid=euid&did_id5=ID5UID&did_id5_linktype=2&did_cpubcid=crumbs_pubcid');
    });

    var request2 = spec.buildRequests([bidRequests[1]], bidderRequest)[0];
    it('sends bid request to our DEV endpoint via GET', function () {
      expect(request2.method).to.equal('GET');
      expect(request2.url).to.equal(ENDPOINT_URL_DEV);
      const data = request2.data.replace(/rnd=\d+\&/g, '').replace(/ref=.*\&bid/g, 'bid').replace(/pbver=.*?&/g, 'pbver=test&');
      expect(data).to.equal('_f=auto&alternative=prebid_js&inventory_item_id=101&srw=300&srh=250&idt=100&bid_id=30b31c1838de1e2&pbver=test&pfilter%5Bgdpr_consent%5D=BOJ%2FP2HOJ%2FP2HABABMAAAAAZ%2BA%3D%3D&pfilter%5Bgdpr%5D=true&prebidDevMode=1&auctionId=1d1a030790a476&media_types%5Bbanner%5D=300x250');
    });

    // Without gdprConsent
    var bidderRequestWithoutGdpr = {
      refererInfo: {
        referer: 'some_referrer.net'
      }
    };
    var request3 = spec.buildRequests([bidRequests[2]], bidderRequestWithoutGdpr)[0];
    it('sends bid request without gdprConsent to our endpoint via GET', function () {
      expect(request3.method).to.equal('GET');
      expect(request3.url).to.equal(ENDPOINT_URL);
      const data = request3.data.replace(/rnd=\d+\&/g, '').replace(/ref=.*\&bid/g, 'bid').replace(/pbver=.*?&/g, 'pbver=test&');
      expect(data).to.equal('_f=auto&alternative=prebid_js&inventory_item_id=6682&srw=300&srh=250&idt=100&bid_id=30b31c1838de1e3&pbver=test&pfilter%5Bfloorprice%5D=1000000&pfilter%5Bprivate_auction%5D=0&pfilter%5Bgeo%5D%5Bcountry%5D=DE&bcat=IAB2%2CIAB4&dvt=desktop&auctionId=1d1a030790a477&pbcode=testDiv2&media_types%5Bbanner%5D=300x250');
    });

    var request4 = spec.buildRequests([bidRequests[3]], bidderRequestWithoutGdpr)[0];
    it('sends bid request without gdprConsent  to our DEV endpoint via GET', function () {
      expect(request4.method).to.equal('GET');
      expect(request4.url).to.equal(ENDPOINT_URL_DEV);
      const data = request4.data.replace(/rnd=\d+\&/g, '').replace(/ref=.*\&bid/g, 'bid').replace(/pbver=.*?&/g, 'pbver=test&');
      expect(data).to.equal('_f=auto&alternative=prebid_js&inventory_item_id=101&srw=300&srh=250&idt=100&bid_id=30b31c1838de1e4&pbver=test&prebidDevMode=1&auctionId=1d1a030790a478&pbcode=testDiv3&media_types%5Bvideo%5D=640x480&media_types%5Bbanner%5D=300x250&vctx=instream&vpl%5Bprotocols%5D%5B0%5D=1&vpl%5Bprotocols%5D%5B1%5D=2&vpl%5Bplaybackmethod%5D%5B0%5D=2&vpl%5Bskip%5D=1');
    });

    var request5 = spec.buildRequests([bidRequests[4]], bidderRequestWithoutGdpr)[0];
    it('sends bid video request to our endpoint via GET', function () {
      expect(request5.method).to.equal('GET');
      const data = request5.data.replace(/rnd=\d+\&/g, '').replace(/ref=.*\&bid/g, 'bid').replace(/pbver=.*?&/g, 'pbver=test&');
      expect(data).to.equal('_f=auto&alternative=prebid_js&inventory_item_id=101&srw=640&srh=480&idt=100&bid_id=30b31c1838de1e41&pbver=test&prebidDevMode=1&auctionId=1d1a030790a478&pbcode=testDiv4&media_types%5Bvideo%5D=640x480&vctx=instream&vf=vast4&vpl%5Bprotocols%5D%5B0%5D=1&vpl%5Bprotocols%5D%5B1%5D=2&vpl%5Bplaybackmethod%5D%5B0%5D=2&vpl%5Bskip%5D=1');
    });

    var request6 = spec.buildRequests([bidRequests[5]], bidderRequestWithoutGdpr)[0];
    it('sends bid request without gdprConsent  to our DEV endpoint with overriden DEV params via GET', function () {
      expect(request6.method).to.equal('GET');
      expect(request6.url).to.equal('http://localhost');
      const data = request6.data.replace(/rnd=\d+\&/g, '').replace(/ref=.*\&bid/g, 'bid').replace(/pbver=.*?&/g, 'pbver=test&');
      expect(data).to.equal('_f=auto&alternative=prebid_js&inventory_item_id=107&srw=300&srh=250&idt=100&bid_id=30b31c1838de1e4&pbver=test&pfilter%5Btest%5D=1&prebidDevMode=1&auctionId=1d1a030790a478&pbcode=testDiv3&media_types%5Bvideo%5D=640x480&media_types%5Bbanner%5D=300x250&vctx=instream&vpl%5Bmimes%5D%5B0%5D=video%2Fmp4&vpl%5Bprotocols%5D%5B0%5D=1&vpl%5Bprotocols%5D%5B1%5D=2&vpl%5Bplaybackmethod%5D%5B0%5D=2&vpl%5Bskip%5D=1');
    });

    var request7 = spec.buildRequests([bidRequests[5]], bidderRequestWithORTB)[0];
    it('ortb2 iab_content test', function () {
      expect(request7.method).to.equal('GET');
      expect(request7.url).to.equal('http://localhost');
      const data = request7.data.replace(/rnd=\d+\&/g, '').replace(/ref=.*\&bid/g, 'bid').replace(/pbver=.*?&/g, 'pbver=test&');
      expect(data).to.equal('_f=auto&alternative=prebid_js&inventory_item_id=107&srw=300&srh=250&idt=100&bid_id=30b31c1838de1e4&pbver=test&pfilter%5Btest%5D=1&pfilter%5Bgdpr_consent%5D=BOJ%2FP2HOJ%2FP2HABABMAAAAAZ%2BA%3D%3D&pfilter%5Bgdpr%5D=true&pfilter%5Biab_content%5D=cat%3AIAB1-1%7CIAB1-2%7CIAB2-10%2Cepisode%3A1%2Ccontext%3A1%2Cid%3AcontentID%2Ctitle%3AcontentTitle%2Cseries%3AcontentSeries%2Cseason%3AcontentSeason%25203%2Cartist%3AcontentArtist%2Cgenre%3Arock%2Cisrc%3AcontentIsrc%2Curl%3Ahttps%253A%252F%252Fcontent-url.com%252F%2Ckeywords%3Akw1%252Ckw2%252Ckeqword%25203&bcat=BSW1%2CBSW2&pcat=IAB3&prebidDevMode=1&auctionId=1d1a030790a478&pbcode=testDiv3&media_types%5Bvideo%5D=640x480&media_types%5Bbanner%5D=300x250&vctx=instream&vpl%5Bmimes%5D%5B0%5D=video%2Fmp4&vpl%5Bprotocols%5D%5B0%5D=1&vpl%5Bprotocols%5D%5B1%5D=2&vpl%5Bplaybackmethod%5D%5B0%5D=2&vpl%5Bskip%5D=1');
    });

    // bidfloor tests
    const getFloorResponse = {currency: 'EUR', floor: 5};
    let testBidRequest = deepClone(bidRequests[1]);
    let floorRequest = spec.buildRequests([testBidRequest], bidderRequestWithoutGdpr)[0];

    // 1. getBidFloor not exist AND bidfloor not exist - no floorprice in request
    it('bidfloor is not exists in request', function () {
      expect(floorRequest.data).to.not.contain('floorprice');
    });

    // 2. getBidFloor not exist AND pfilter.floorprice exist - use pfilter.floorprice property
    it('bidfloor is equal 0.5', function () {
      testBidRequest = deepClone(bidRequests[0]);
      testBidRequest.params.pfilter = {
        'floorprice': 0.5
      };
      floorRequest = spec.buildRequests([testBidRequest], bidderRequestWithoutGdpr)[0];
      expect(floorRequest.data).to.contain('floorprice%5D=0.5');
    });

    // 3. getBidFloor exist AND pfilter.floorprice not exist - use getFloor method
    it('bidfloor is equal 5', function () {
      testBidRequest = deepClone(bidRequests[1]);
      testBidRequest.getFloor = () => getFloorResponse;
      floorRequest = spec.buildRequests([testBidRequest], bidderRequestWithoutGdpr)[0];
      expect(floorRequest.data).to.contain('floorprice%5D=5');
    });

    // 4. getBidFloor exist AND pfilter.floorprice exist -> use getFloor method
    it('bidfloor is equal 0.35', function () {
      testBidRequest = deepClone(bidRequests[0]);
      testBidRequest.getFloor = () => getFloorResponse;
      testBidRequest.params.pfilter = {
        'floorprice': 0.35
      };
      floorRequest = spec.buildRequests([testBidRequest], bidderRequestWithoutGdpr)[0];
      expect(floorRequest.data).to.contain('floorprice%5D=0.35');
    });
  });

  describe('google topics handling', () => {
    afterEach(() => {
      config.resetConfig();
    });

    const REQPARAMS = {
      refererInfo: {
        referer: 'some_referrer.net'
      },
      gdprConsent: {
        consentString: 'BOJ/P2HOJ/P2HABABMAAAAAZ+A==',
        vendorData: {someData: 'value'},
        gdprApplies: true
      }
    };

    const defaultRequest = {
      'bidder': 'dspx',
      'params': {
        'placement': '6682',
        'pfilter': {
          'floorprice': 1000000,
          'private_auction': 0,
          'geo': {
            'country': 'DE'
          }
        },
        'bcat': 'IAB2,IAB4',
        'dvt': 'desktop'
      },
      'sizes': [
        [300, 250]
      ],
      'bidId': '30b31c1838de1e1',
      'bidderRequestId': '22edbae2733bf61',
      'auctionId': '1d1a030790a475',
      'adUnitCode': 'testDiv1',
    };

    it('does pass segtax, segclass, segments for google topics data', () => {
      const GOOGLE_TOPICS_DATA = {
        ortb2: {
          user: {
            data: [
              {
                ext: {
                  segtax: 600,
                  segclass: 'v1',
                },
                segment: [
                  {id: '717'}, {id: '808'},
                ]
              }
            ]
          },
        },
      }
      config.setConfig(GOOGLE_TOPICS_DATA);
      const request = spec.buildRequests([defaultRequest], { ...REQPARAMS, ...GOOGLE_TOPICS_DATA })[0];
      expect(request.data).to.contain('segtx=600&segcl=v1&segs=717%2C808');
    });

    it('does not pass topics params for invalid topics data', () => {
      const INVALID_TOPICS_DATA = {
        ortb2: {
          user: {
            data: [
              {
                segment: []
              },
              {
                segment: [{id: ''}]
              },
              {
                segment: [{id: null}]
              },
              {
                segment: [{id: 'dummy'}, {id: '123'}]
              },
              {
                ext: {
                  segtax: 600,
                  segclass: 'v1',
                },
                segment: [
                  {
                    name: 'dummy'
                  }
                ]
              },
            ]
          }
        }
      };

      config.setConfig(INVALID_TOPICS_DATA);
      const request = spec.buildRequests([defaultRequest], { ...REQPARAMS, ...INVALID_TOPICS_DATA })[0];
      expect(request.data).to.not.contain('segtax');
      expect(request.data).to.not.contain('segclass');
      expect(request.data).to.not.contain('segments');
    });
  });

  describe('interpretResponse', function () {
    const serverResponse = {
      'body': {
        'cpm': 5000000,
        'crid': 100500,
        'width': '300',
        'height': '250',
        'type': 'sspHTML',
        'adTag': '<!-- test creative -->',
        'requestId': '220ed41385952a',
        'currency': 'EUR',
        'ttl': 60,
        'netRevenue': true,
        'zone': '6682',
        'adomain': ['bdomain']
      }
    };
    const serverVideoResponse = {
      'body': {
        'cpm': 5000000,
        'crid': 100500,
        'width': '300',
        'height': '250',
        'vastXml': '{"reason":7001,"status":"accepted"}',
        'requestId': '220ed41385952a',
        'type': 'vast2',
        'currency': 'EUR',
        'ttl': 60,
        'netRevenue': true,
        'zone': '6682',
        'renderer': {id: 1, url: '//player.example.com', options: {}}
      }
    };
    const serverVideoResponseVastUrl = {
      'body': {
        'cpm': 5000000,
        'crid': 100500,
        'width': '300',
        'height': '250',
        'requestId': '220ed41385952a',
        'type': 'vast2',
        'currency': 'EUR',
        'ttl': 60,
        'netRevenue': true,
        'zone': '6682',
        'vastUrl': 'https://local/vasturl1',
        'videoCacheKey': 'cache_123',
        'bid_appendix': {'someField': 'someValue'}
      }
    };

    const expectedResponse = [{
      requestId: '23beaa6af6cdde',
      cpm: 0.5,
      width: 0,
      height: 0,
      creativeId: 100500,
      dealId: '',
      currency: 'EUR',
      netRevenue: true,
      ttl: 60,
      type: 'sspHTML',
      ad: '<!-- test creative -->',
      meta: {advertiserDomains: ['bdomain']},
    }, {
      requestId: '23beaa6af6cdde',
      cpm: 0.5,
      width: 0,
      height: 0,
      creativeId: 100500,
      dealId: '',
      currency: 'EUR',
      netRevenue: true,
      ttl: 300,
      type: 'vast2',
      vastXml: '{"reason":7001,"status":"accepted"}',
      mediaType: 'video',
      meta: {advertiserDomains: []},
      renderer: {}
    }, {
      requestId: '23beaa6af6cdde',
      cpm: 0.5,
      width: 0,
      height: 0,
      creativeId: 100500,
      dealId: '',
      currency: 'EUR',
      netRevenue: true,
      ttl: 60,
      type: 'vast2',
      vastUrl: 'https://local/vasturl1',
      videoCacheKey: 'cache_123',
      mediaType: 'video',
      meta: {advertiserDomains: []},
      someField: 'someValue'
    }];

    it('should get the correct bid response by display ad', function () {
      const bidRequest = [{
        'method': 'GET',
        'url': ENDPOINT_URL,
        'data': {
          'bid_id': '30b31c1838de1e'
        }
      }];
      const result = spec.interpretResponse(serverResponse, bidRequest[0]);
      expect(Object.keys(result[0])).to.include.members(Object.keys(expectedResponse[0]));
      expect(result[0].meta.advertiserDomains.length).to.equal(1);
      expect(result[0].meta.advertiserDomains[0]).to.equal(expectedResponse[0].meta.advertiserDomains[0]);
    });

    it('should get the correct dspx video bid response by display ad', function () {
      const bidRequest = [{
        'method': 'GET',
        'url': ENDPOINT_URL,
        'mediaTypes': {
          'video': {
            'playerSize': [640, 480],
            'context': 'outstream'
          }
        },
        'data': {
          'bid_id': '30b31c1838de1e'
        }
      }];
      const result = spec.interpretResponse(serverVideoResponse, bidRequest[0]);
      expect(Object.keys(result[0])).to.include.members(Object.keys(expectedResponse[1]));
      expect(result[0].meta.advertiserDomains.length).to.equal(0);
    });

    it('should get the correct dspx video bid response by display ad (vastUrl)', function () {
      const bidRequest = [{
        'method': 'GET',
        'url': ENDPOINT_URL,
        'mediaTypes': {
          'video': {
            'playerSize': [640, 480],
            'context': 'instream'
          }
        },
        'data': {
          'bid_id': '30b31c1838de1e'
        }
      }];
      const result = spec.interpretResponse(serverVideoResponseVastUrl, bidRequest[0]);
      expect(Object.keys(result[0])).to.include.members(Object.keys(expectedResponse[2]));
      expect(result[0].meta.advertiserDomains.length).to.equal(0);
    });

    it('handles empty bid response', function () {
      const response = {
        body: {}
      };
      const result = spec.interpretResponse(response);
      expect(result.length).to.equal(0);
    });
  });

  describe(`getUserSyncs test usage`, function () {
    let serverResponses;

    beforeEach(function () {
      serverResponses = [{
        body: {
          requestId: '23beaa6af6cdde',
          cpm: 0.5,
          width: 0,
          height: 0,
          creativeId: 100500,
          dealId: '',
          currency: 'EUR',
          netRevenue: true,
          ttl: 300,
          type: 'sspHTML',
          ad: '<!-- test creative -->',
          userSync: {
            iframeUrl: ['anyIframeUrl?a=1'],
            imageUrl: ['anyImageUrl', 'anyImageUrl2']
          }
        }
      }];
    });

    it(`return value should be an array`, function () {
      expect(spec.getUserSyncs({ iframeEnabled: true })).to.be.an('array');
    });
    it(`array should have only one object and it should have a property type = 'iframe'`, function () {
      expect(spec.getUserSyncs({ iframeEnabled: true }, serverResponses).length).to.be.equal(1);
      const [userSync] = spec.getUserSyncs({ iframeEnabled: true }, serverResponses);
      expect(userSync).to.have.property('type');
      expect(userSync.type).to.be.equal('iframe');
    });
    it(`we have valid sync url for iframe`, function () {
      const [userSync] = spec.getUserSyncs({ iframeEnabled: true }, serverResponses, {consentString: 'anyString'});
      expect(userSync.url).to.be.equal('anyIframeUrl?a=1&gdpr_consent=anyString')
      expect(userSync.type).to.be.equal('iframe');
    });
    it(`we have valid sync url for image`, function () {
      const [userSync] = spec.getUserSyncs({ pixelEnabled: true }, serverResponses, {gdprApplies: true, consentString: 'anyString'});
      expect(userSync.url).to.be.equal('anyImageUrl?gdpr=1&gdpr_consent=anyString')
      expect(userSync.type).to.be.equal('image');
    });
    it(`we have valid sync url for image and iframe`, function () {
      const userSync = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, serverResponses, {gdprApplies: true, consentString: 'anyString'});
      expect(userSync.length).to.be.equal(3);
      expect(userSync[0].url).to.be.equal('anyIframeUrl?a=1&gdpr=1&gdpr_consent=anyString')
      expect(userSync[0].type).to.be.equal('iframe');
      expect(userSync[1].url).to.be.equal('anyImageUrl?gdpr=1&gdpr_consent=anyString')
      expect(userSync[1].type).to.be.equal('image');
      expect(userSync[2].url).to.be.equal('anyImageUrl2?gdpr=1&gdpr_consent=anyString')
      expect(userSync[2].type).to.be.equal('image');
    });
  });

  describe(`getUserSyncs test usage in passback response`, function () {
    let serverResponses;

    beforeEach(function () {
      serverResponses = [{
        body: {
          reason: 8002,
          status: 'error',
          msg: 'passback',
        }
      }];
    });

    it(`check for zero array when iframeEnabled`, function () {
      expect(spec.getUserSyncs({ iframeEnabled: true })).to.be.an('array');
      expect(spec.getUserSyncs({ iframeEnabled: true }, serverResponses).length).to.be.equal(0);
    });
    it(`check for zero array when iframeEnabled`, function () {
      expect(spec.getUserSyncs({ pixelEnabled: true })).to.be.an('array');
      expect(spec.getUserSyncs({ pixelEnabled: true }, serverResponses).length).to.be.equal(0);
    });
  });
});

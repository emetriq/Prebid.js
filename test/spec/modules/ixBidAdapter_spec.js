import * as utils from 'src/utils.js';
import { config } from 'src/config.js';
import { expect } from 'chai';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { spec, storage, FEATURE_TOGGLES, LOCAL_STORAGE_FEATURE_TOGGLES_KEY, REQUESTED_FEATURE_TOGGLES, combineImps, bidToVideoImp, bidToNativeImp, deduplicateImpExtFields, removeSiteIDs, addDeviceInfo, getDivIdFromAdUnitCode } from '../../../modules/ixBidAdapter.js';
import { deepAccess, deepClone } from '../../../src/utils.js';
import * as ajaxLib from 'src/ajax.js';
import * as gptUtils from '../../../libraries/gptUtils/gptUtils.js';

describe('IndexexchangeAdapter', function () {
  const IX_SECURE_ENDPOINT = 'https://htlb.casalemedia.com/openrtb/pbjs';

  FEATURE_TOGGLES.REQUESTED_FEATURE_TOGGLES = ['test1', 'test2'];

  const SAMPLE_SCHAIN = {
    'ver': '1.0',
    'complete': 1,
    'nodes': [
      {
        'asi': 'indirectseller.com',
        'sid': '00001',
        'hp': 1
      },
      {
        'asi': 'indirectseller-2.com',
        'sid': '00002',
        'hp': 2
      }
    ]
  };
  const LARGE_SET_OF_SIZES = [
    [300, 250],
    [600, 410],
    [336, 280],
    [400, 300],
    [320, 50],
    [360, 360],
    [250, 250],
    [320, 250],
    [400, 250],
    [387, 359],
    [300, 50],
    [372, 250],
    [320, 320],
    [412, 412],
    [327, 272],
    [312, 260],
    [384, 320],
    [335, 250],
    [366, 305],
    [374, 250],
    [375, 375],
    [272, 391],
    [364, 303],
    [414, 414],
    [366, 375],
    [272, 360],
    [364, 373],
    [366, 359],
    [320, 100],
    [360, 250],
    [468, 60],
    [480, 300],
    [600, 400],
    [600, 300],
    [33, 28],
    [40, 30],
    [32, 5],
    [36, 36],
    [25, 25],
    [320, 25],
    [400, 25],
    [387, 35],
    [300, 5],
    [372, 20],
    [320, 32],
    [412, 41],
    [327, 27],
    [312, 26],
    [384, 32],
    [335, 25],
    [366, 30],
    [374, 25],
    [375, 37],
    [272, 31],
    [364, 303],
    [414, 41],
    [366, 35],
    [272, 60],
    [364, 73],
    [366, 59],
    [320, 10],
    [360, 25],
    [468, 6],
    [480, 30],
    [600, 40],
    [600, 30]
  ];

  const ONE_VIDEO = [
    {
      bidder: 'ix',
      params: {
        siteId: '456',
        video: {
          skippable: false,
          mimes: [
            'video/mp4',
            'video/webm'
          ],
          minduration: 0,
          maxduration: 60,
          protocols: [2]
        },
        size: [400, 100]
      },
      sizes: [[400, 100]],
      mediaTypes: {
        video: {
          context: 'instream',
          playerSize: [[400, 100]]
        }
      },
      ortb2Imp: {
        ext: {
          tid: '173f49a8-7549-4218-a23c-e7ba59b47230'
        }
      },
      adUnitCode: 'div-gpt-ad-1460505748562-0',
      transactionId: '173f49a8-7549-4218-a23c-e7ba59b47230',
      bidId: '1a2b3c4e',
      bidderRequestId: '11a22b33c44e',
      auctionId: '1aa2bb3cc4de',
      ortb2: {
        source: {
          ext: {
            schain: SAMPLE_SCHAIN
          }
        }
      }
    }
  ];

  const ONE_BANNER = [
    {
      bidder: 'ix',
      params: {
        siteId: '123',
        size: [300, 250]
      },
      sizes: [[300, 250]],
      mediaTypes: {
        banner: {
          sizes: [[300, 250]]
        }
      },
      ortb2Imp: {
        ext: {
          tid: '173f49a8-7549-4218-a23c-e7ba59b47229'
        }
      },
      adUnitCode: 'div-gpt-ad-1460505748561-0',
      transactionId: '173f49a8-7549-4218-a23c-e7ba59b47229',
      bidId: '1a2b3c4d',
      bidderRequestId: '11a22b33c44d',
      auctionId: '1aa2bb3cc4dd',
      ortb2: {
        source: {
          ext: {
            schain: SAMPLE_SCHAIN
          }
        }
      }
    }
  ];

  const DEFAULT_BANNER_VALID_BID = [
    {
      bidder: 'ix',
      params: {
        siteId: '123',
        size: [300, 250]
      },
      sizes: [[300, 250], [300, 600]],
      mediaTypes: {
        banner: {
          sizes: [[300, 250], [300, 600]],
          pos: 0
        }
      },
      ortb2Imp: {
        ext: {
          tid: '173f49a8-7549-4218-a23c-e7ba59b47229'
        }
      },
      adUnitCode: 'div-gpt-ad-1460505748561-0',
      transactionId: '173f49a8-7549-4218-a23c-e7ba59b47229',
      bidId: '1a2b3c4d',
      bidderRequestId: '11a22b33c44d',
      auctionId: '1aa2bb3cc4dd',
      ortb2: {
        source: {
          ext: {
            schain: SAMPLE_SCHAIN
          }
        }
      }
    }
  ];

  const DEFAULT_BANNER_VALID_BID_WITH_FLEDGE_ENABLED = [
    {
      bidder: 'ix',
      params: {
        siteId: '123',
        size: [300, 250]
      },
      sizes: [[300, 250], [300, 600]],
      mediaTypes: {
        banner: {
          sizes: [[300, 250], [300, 600]],
          pos: 0
        }
      },
      ortb2Imp: {
        ext: {
          tid: '173f49a8-7549-4218-a23c-e7ba59b47229',
          ae: 1 // Fledge enabled
        },
      },
      adUnitCode: 'div-fledge-ad-1460505748561-0',
      transactionId: '173f49a8-7549-4218-a23c-e7ba59b47229',
      bidId: '1a2b3c4d',
      bidderRequestId: '11a22b33c44d',
      auctionId: '1aa2bb3cc4dd',
      ortb2: {
        source: {
          ext: {
            schain: SAMPLE_SCHAIN
          }
        }
      }
    }
  ];

  const DEFAULT_BANNER_VALID_BID_PARAM_NO_SIZE = [
    {
      bidder: 'ix',
      params: {
        siteId: '123'
      },
      mediaTypes: {
        banner: {
          sizes: [[300, 250], [300, 600]]
        }
      },
      ortb2Imp: {
        ext: {
          tid: '173f49a8-7549-4218-a23c-e7ba59b47229'
        }
      },
      adUnitCode: 'div-gpt-ad-1460505748561-0',
      transactionId: '173f49a8-7549-4218-a23c-e7ba59b47229',
      bidId: '1a2b3c4d',
      bidderRequestId: '11a22b33c44d',
      auctionId: '1aa2bb3cc4dd',
      ortb2: {
        source: {
          ext: {
            schain: SAMPLE_SCHAIN
          }
        }
      }
    }
  ];

  const DEFAULT_VIDEO_VALID_BID_NO_VIDEO_PARAMS = [
    {
      bidder: 'ix',
      params: {
        siteId: '456'
      },
      sizes: [400, 100],
      mediaTypes: {
        video: {
          context: 'instream',
          playerSize: [[400, 100]],
          mimes: [
            'video/mp4',
            'video/webm'
          ],
          minduration: 0,
          maxduration: 60,
          protocols: [2]
        }
      },
      ortb2Imp: {
        ext: {
          tid: '173f49a8-7549-4218-a23c-e7ba59b47230'
        }
      },
      adUnitCode: 'div-gpt-ad-1460505748562-0',
      transactionId: '173f49a8-7549-4218-a23c-e7ba59b47230',
      bidId: '1a2b3c4e',
      bidderRequestId: '11a22b33c44e',
      auctionId: '1aa2bb3cc4de',
      ortb2: {
        source: {
          ext: {
            schain: SAMPLE_SCHAIN
          }
        }
      }
    }
  ];

  const DEFAULT_VIDEO_VALID_BID = [
    {
      bidder: 'ix',
      params: {
        siteId: '456',
        video: {
          skippable: false,
          mimes: [
            'video/mp4',
            'video/webm'
          ],
          minduration: 0,
          maxduration: 60,
          protocols: [2]
        },
        size: [400, 100]
      },
      sizes: [[400, 100], [200, 400]],
      mediaTypes: {
        video: {
          context: 'instream',
          playerSize: [[400, 100], [200, 400]]
        }
      },
      ortb2Imp: {
        ext: {
          tid: '173f49a8-7549-4218-a23c-e7ba59b47230'
        }
      },
      adUnitCode: 'div-gpt-ad-1460505748562-0',
      transactionId: '173f49a8-7549-4218-a23c-e7ba59b47230',
      bidId: '1a2b3c4e',
      bidderRequestId: '11a22b33c44e',
      auctionId: '1aa2bb3cc4de',
      ortb2: {
        source: {
          ext: {
            schain: SAMPLE_SCHAIN
          }
        }
      }
    }
  ];

  const DEFAULT_VIDEO_VALID_BID_MEDIUM_SIZE = [
    {
      bidder: 'ix',
      params: {
        siteId: '456',
        video: {
          skippable: false,
          mimes: [
            'video/mp4',
            'video/webm'
          ],
          minduration: 0,
          maxduration: 60,
          protocols: [2]
        },
        size: [640, 480]
      },
      sizes: [[640, 480], [200, 400]],
      mediaTypes: {
        video: {
          context: 'instream',
          playerSize: [[640, 480], [200, 400]]
        }
      },
      ortb2Imp: {
        ext: {
          tid: '173f49a8-7549-4218-a23c-e7ba59b47230'
        }
      },
      adUnitCode: 'div-gpt-ad-1460505748562-0',
      transactionId: '173f49a8-7549-4218-a23c-e7ba59b47230',
      bidId: '1a2b3c4e',
      bidderRequestId: '11a22b33c44e',
      auctionId: '1aa2bb3cc4de',
      ortb2: {
        source: {
          ext: {
            schain: SAMPLE_SCHAIN
          }
        }
      }
    }
  ];

  const DEFAULT_MULTIFORMAT_BANNER_VALID_BID = [
    {
      bidder: 'ix',
      params: {
        tagId: '123',
        siteId: '123',
        size: [300, 250],
      },
      mediaTypes: {
        video: {
          context: 'outstream',
          playerSize: [[600, 700]]
        },
        banner: {
          sizes: [[300, 250], [300, 600], [400, 500]]
        }
      },
      ortb2Imp: {
        ext: {
          tid: '173f49a8-7549-4218-a23c-e7ba59b47230',
          data: {
            pbadslot: 'div-gpt-ad-1460505748562-0'
          }
        }
      },
      adUnitCode: 'div-gpt-ad-1460505748562-0',
      transactionId: '173f49a8-7549-4218-a23c-e7ba59b47230',
      bidId: '1a2b3c4e',
      bidderRequestId: '11a22b33c44e',
      auctionId: '1aa2bb3cc4de',
      ortb2: {
        source: {
          ext: {
            schain: SAMPLE_SCHAIN
          }
        }
      }
    }
  ];

  const DEFAULT_MULTIFORMAT_VIDEO_VALID_BID = [
    {
      bidder: 'ix',
      params: {
        tagId: '123',
        siteId: '456',
        video: {
          skippable: false,
          mimes: [
            'video/mp4',
            'video/webm'
          ],
          minduration: 0,
          maxduration: 60,
          protocols: [1]
        },
        size: [300, 250]
      },
      mediaTypes: {
        video: {
          context: 'outstream',
          playerSize: [[300, 250]]
        },
        banner: {
          sizes: [[300, 250], [300, 600]]
        }
      },
      ortb2Imp: {
        ext: {
          tid: '273f49a8-7549-4218-a23c-e7ba59b47230',
          data: {
            pbadslot: 'div-gpt-ad-1460505748562-1'
          }
        }
      },
      adUnitCode: 'div-gpt-ad-1460505748562-1',
      transactionId: '273f49a8-7549-4218-a23c-e7ba59b47230',
      bidId: '1a2b3c4e',
      bidderRequestId: '11a22b33c44e',
      auctionId: '1aa2bb3cc4de',
      ortb2: {
        source: {
          ext: {
            schain: SAMPLE_SCHAIN
          }
        }
      }
    }
  ];

  const DEFAULT_MULTIFORMAT_VALID_BID = [
    {
      bidder: 'ix',
      params: {
        tagId: '123',
        siteId: '456',
        video: {
          siteId: '1111'
        },
        banner: {
          siteId: '2222'
        },
        native: {
          siteId: '3333'
        },
        size: [300, 250]
      },
      mediaTypes: {
        video: {
          context: 'outstream',
          playerSize: [[300, 250]],
          skippable: false,
          mimes: [
            'video/mp4',
            'video/webm'
          ],
          minduration: 0,
          maxduration: 60,
          protocols: [1]
        },
        banner: {
          sizes: [[300, 250], [300, 600]]
        },
        native: {
          icon: {
            required: false
          },
          title: {
            len: 25,
            required: true
          },
          body: {
            required: true
          },
          image: {
            required: true
          },
          sponsoredBy: {
            required: true
          }
        }
      },
      ortb2Imp: {
        ext: {
          tid: '273f49a8-7549-4218-a23c-e7ba59b47230',
          data: {
            pbadslot: 'div-gpt-ad-1460505748562-0'
          }
        }
      },
      nativeOrtbRequest: {
        assets: [{id: 0, required: 0, img: {type: 1}}, {id: 1, required: 1, title: {len: 140}}, {id: 2, required: 1, data: {type: 2}}, {id: 3, required: 1, img: {type: 3}}, {id: 4, required: false, video: {mimes: ['video/mp4', 'video/webm'], minduration: 0, maxduration: 120, protocols: [2, 3, 5, 6]}}]
      },
      adUnitCode: 'div-gpt-ad-1460505748562-0',
      transactionId: '273f49a8-7549-4218-a23c-e7ba59b47230',
      bidId: '1a2b3c4e',
      bidderRequestId: '11a22b33c44e',
      auctionId: '1aa2bb3cc4de',
      ortb2: {
        source: {
          ext: {
            schain: SAMPLE_SCHAIN
          }
        }
      }
    }
  ];

  const DEFAULT_NATIVE_VALID_BID = [
    {
      bidder: 'ix',
      params: {
        siteId: '123',
        size: [300, 250]
      },
      sizes: [[300, 250], [300, 600]],
      mediaTypes: {
        native: {
          icon: {
            required: false
          },
          title: {
            len: 25,
            required: true
          },
          body: {
            required: true
          },
          image: {
            required: true
          },
          video: {
            required: false,
            mimes: ['video/mp4', 'video/webm'],
            minduration: 0,
            maxduration: 120,
            protocols: [2, 3, 5, 6]
          },
          sponsoredBy: {
            required: true
          }
        }
      },
      nativeOrtbRequest: {
        assets: [{ id: 0, required: 0, img: { type: 1 } }, { id: 1, required: 1, title: { len: 140 } }, { id: 2, required: 1, data: { type: 2 } }, { id: 3, required: 1, img: { type: 3 } }, { id: 4, required: false, video: { mimes: ['video/mp4', 'video/webm'], minduration: 0, maxduration: 120, protocols: [2, 3, 5, 6] } }]
      },
      adUnitCode: 'div-gpt-ad-1460505748563-0',
      transactionId: '173f49a8-7549-4218-a23c-e7ba59b47231',
      bidId: '1a2b3c4f',
      bidderRequestId: '11a22b33c44f',
      auctionId: '1aa2bb3cc4df',
      ortb2: {
        source: {
          ext: {
            schain: SAMPLE_SCHAIN
          }
        }
      }
    }
  ];

  const DEFAULT_MULTIFORMAT_NATIVE_VALID_BID = [
    {
      bidder: 'ix',
      params: {
        siteId: '123',
        size: [300, 250],
      },
      mediaTypes: {
        banner: {
          sizes: [[300, 250], [300, 600], [400, 500]]
        },
        native: {
          title: {
            required: true
          },
          body: {
            required: true
          },
          image: {
            required: true
          },
          sponsoredBy: {
            required: true
          },
          icon: {
            required: false
          }
        }
      },
      nativeOrtbRequest: {
        assets: [{ id: 0, required: 0, img: { type: 1 } }, { id: 1, required: 1, title: { len: 140 } }, { id: 2, required: 1, data: { type: 2 } }, { id: 3, required: 1, img: { type: 3 } }, { id: 4, required: false, video: { mimes: ['video/mp4', 'video/webm'], minduration: 0, maxduration: 120, protocols: [2, 3, 5, 6] } }]
      },
      adUnitCode: 'div-gpt-ad-1460505748562-0',
      transactionId: '173f49a8-7549-4218-a23c-e7ba59b47230',
      bidId: '1a2b3c4e',
      bidderRequestId: '11a22b33c44e',
      auctionId: '1aa2bb3cc4de',
      ortb2: {
        source: {
          ext: {
            schain: SAMPLE_SCHAIN
          }
        }
      }
    }
  ];

  const DEFAULT_NATIVE_IMP = {
    request: '{"assets":[{"id":0,"required":0,"img":{"type":1}},{"id":1,"required":1,"title":{"len":140}},{"id":2,"required":1,"data":{"type":2}},{"id":3,"required":1,"img":{"type":3}},{"id":4,"required":false,"video":{"mimes":["video/mp4","video/webm"],"minduration":0,"maxduration":120,"protocols":[2,3,5,6]}}],"eventtrackers":[{"event":1,"methods":[1,2]}],"privacy":1}',
    ver: '1.2'
  }

  const DEFAULT_BANNER_BID_RESPONSE = {
    cur: 'USD',
    id: '11a22b33c44d',
    seatbid: [
      {
        bid: [
          {
            crid: '12345',
            adomain: ['www.abc.com'],
            adid: '14851455',
            impid: '1a2b3c4d',
            cid: '3051266',
            price: 100,
            w: 300,
            h: 250,
            id: '1',
            ext: {
              dspid: 50,
              pricelevel: '_100',
              advbrandid: 303325,
              advbrand: 'OECTA',
              ibv: true
            },
            adm: '<a target="_blank" href="https://www.indexexchange.com"></a>'
          }
        ],
        seat: '3970'
      }
    ]
  };

  const DEFAULT_BANNER_BID_RESPONSE_WITH_DSA = {
    cur: 'USD',
    id: '11a22b33c44d',
    seatbid: [
      {
        bid: [
          {
            crid: '12345',
            adomain: ['www.abc.com'],
            adid: '14851455',
            impid: '1a2b3c4d',
            cid: '3051266',
            price: 100,
            w: 300,
            h: 250,
            id: '1',
            ext: {
              dspid: 50,
              pricelevel: '_100',
              advbrandid: 303325,
              advbrand: 'OECTA',
              dsa: {
                behalf: 'Advertiser',
                paid: 'Advertiser',
                transparency: [{
                  domain: 'dsp1domain.com',
                  dsaparams: [1, 2]
                }],
                'adrender': 1
              }
            },
            adm: '<a target="_blank" href="https://www.indexexchange.com"></a>'
          }
        ],
        seat: '3970'
      }
    ]
  };

  const DEFAULT_BANNER_BID_RESPONSE_WITHOUT_ADOMAIN = {
    cur: 'USD',
    id: '11a22b33c44d',
    seatbid: [
      {
        bid: [
          {
            crid: '12345',
            adid: '14851455',
            impid: '1a2b3c4d',
            cid: '3051266',
            price: 100,
            w: 300,
            h: 250,
            id: '1',
            ext: {
              dspid: 50,
              pricelevel: '_100',
              advbrandid: 303325,
              advbrand: 'OECTA'
            },
            adm: '<a target="_blank" href="https://www.indexexchange.com"></a>'
          }
        ],
        seat: '3970'
      }
    ]
  };

  const DEFAULT_VIDEO_BID_RESPONSE = {
    cur: 'USD',
    id: '1aa2bb3cc4de',
    seatbid: [
      {
        bid: [
          {
            crid: '12346',
            adomain: ['www.abcd.com'],
            adid: '14851456',
            impid: '1a2b3c4e',
            cid: '3051267',
            price: 110,
            id: '2',
            ext: {
              vasturl: 'www.abcd.com/vast',
              errorurl: 'www.abcd.com/error',
              dspid: 51,
              pricelevel: '_110',
              advbrandid: 303326,
              advbrand: 'OECTB'
            }
          }
        ],
        seat: '3971'
      }
    ],
    ext: {
      videoplayerurl: 'https://test.com/video-renderer.js'
    }
  };

  const DEFAULT_VIDEO_BID_RESPONSE_WITH_XML_ADM = {
    cur: 'USD',
    id: '1aa2bb3cc4de',
    seatbid: [
      {
        bid: [
          {
            crid: '12346',
            adomain: ['www.abcd.com'],
            adid: '14851456',
            impid: '1a2b3c4e',
            cid: '3051267',
            price: 110,
            id: '2',
            mtype: 2,
            adm: '<?xml version=\"1.0\" encoding=\"UTF-8\"?><VAST xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:noNamespaceSchemaLocation=\"vast.xsd\" version=\"3.0\"> <Ad id=\"488427365\">  <InLine>   <AdSystem>Test</AdSystem>   <AdTitle>In-Stream Video</AdTitle> </InLine> </Ad></VAST',
            ext: {
              errorurl: 'www.abcd.com/error',
              dspid: 51,
              pricelevel: '_110',
              advbrandid: 303326,
              advbrand: 'OECTB'
            }
          }
        ],
        seat: '3971'
      }
    ]
  };

  const DEFAULT_NATIVE_BID_RESPONSE = {
    cur: 'USD',
    id: '11a22b33c44d',
    seatbid: [
      {
        bid: [
          {
            crid: '12345',
            adomain: ['www.abc.com'],
            adid: '14851455',
            impid: '1a2b3c4d',
            cid: '3051266',
            price: 100,
            id: '1',
            ext: {
              dspid: 50,
              pricelevel: '_100',
              advbrandid: 303325,
              advbrand: 'OECTA'
            },
            adm: '{"native":{"ver":"1.2","assets":[{"id":0,"img":{"url":"https://cdn.liftoff.io/customers/1209/creatives/2501-icon-250x250.png","w":250,"h":250}},{"id":1,"img":{"url":"https://cdn.liftoff.io/customers/5a9cab9cc6/image/lambda_png/a0355879b06c09b09232.png","w":1200,"h":627}},{"id":2,"data":{"value":"autodoc.co.uk"}},{"id":3,"data":{"value":"Les pièces automobiles dont vous avez besoin, toujours sous la main."}},{"id":4,"title":{"text":"Autodoc"}},{"id":5,"video":{"vasttag":"<VAST>blah</VAST>"}}],"link":{"url":"https://play.google.com/store/apps/details?id=de.autodoc.gmbh","clicktrackers":["https://click.liftoff.io/v1/campaign_click/blah"]},"eventtrackers":[{"event":1,"method":1,"url":"https://impression-europe.liftoff.io/index/impression"},{"event":1,"method":1,"url":"https://a701.casalemedia.com/impression/v1"}],"privacy":"https://privacy.link.com"}}'
          }
        ],
        seat: '3970'
      }
    ]
  };

  const DEFAULT_OPTION = {
    gdprConsent: {
      gdprApplies: true,
      consentString: '3huaa11=qu3198ae',
      vendorData: {}
    },
    refererInfo: {
      page: 'https://www.prebid.org',
      canonicalUrl: 'https://www.prebid.org/the/link/to/the/page'
    },
    ortb2: {
      site: {
        page: 'https://www.prebid.org'
      },
      source: {
        tid: 'mock-tid'
      }
    }
  };

  const DEFAULT_OPTION_FLEDGE_ENABLED_GLOBALLY = {
    gdprConsent: {
      gdprApplies: true,
      consentString: '3huaa11=qu3198ae',
      vendorData: {}
    },
    refererInfo: {
      page: 'https://www.prebid.org',
      canonicalUrl: 'https://www.prebid.org/the/link/to/the/page'
    },
    ortb2: {
      site: {
        page: 'https://www.prebid.org'
      },
      source: {
        tid: 'mock-tid'
      }
    },
    paapi: {
      enabled: true
    },
  };

  const DEFAULT_OPTION_FLEDGE_ENABLED = {
    gdprConsent: {
      gdprApplies: true,
      consentString: '3huaa11=qu3198ae',
      vendorData: {}
    },
    refererInfo: {
      page: 'https://www.prebid.org',
      canonicalUrl: 'https://www.prebid.org/the/link/to/the/page'
    },
    ortb2: {
      site: {
        page: 'https://www.prebid.org'
      },
      source: {
        tid: 'mock-tid'
      }
    },
    paapi: {
      enabled: true
    }
  };

  const DEFAULT_IDENTITY_RESPONSE = {
    IdentityIp: {
      responsePending: false,
      data: {
        source: 'identityinc.com',
        uids: [
          {
            id: 'identityid',
            atype: 1
          }
        ]
      }
    }
  };

  const DEFAULT_USERID_DATA = {
    idl_env: '1234-5678-9012-3456', // Liveramp
    netId: 'testnetid123', // NetId
    IDP: 'userIDP000', // IDP
    fabrickId: 'fabrickId9000', // FabrickId
    // so structured because when calling createEidsArray, UID2's getValue func takes .id to set in uids
    uid2: { id: 'testuid2' }, // UID 2.0
    // similar to uid2, but id5's getValue takes .uid
    id5id: { uid: 'testid5id' }, // ID5
    imuid: 'testimuid',
    '33acrossId': { envelope: 'v1.5fs.1000.fjdiosmclds' },
    'criteoID': { envelope: 'testcriteoID' },
    'euidID': { envelope: 'testeuid' },
    pairId: {envelope: 'testpairId'}
  };

  const DEFAULT_USERID_PAYLOAD = [
    {
      source: 'liveramp.com',
      uids: [{
        id: DEFAULT_USERID_DATA.idl_env,
        ext: {
          rtiPartner: 'idl'
        }
      }]
    }, {
      source: 'netid.de',
      uids: [{
        id: DEFAULT_USERID_DATA.netId,
        ext: {
          rtiPartner: 'NETID'
        }
      }]
    }, {
      source: 'neustar.biz',
      uids: [{
        id: DEFAULT_USERID_DATA.fabrickId,
        ext: {
          rtiPartner: 'fabrickId'
        }
      }]
    }, {
      source: 'zeotap.com',
      uids: [{
        id: DEFAULT_USERID_DATA.IDP,
        ext: {
          rtiPartner: 'zeotapIdPlus'
        }
      }]
    }, {
      source: 'uidapi.com',
      uids: [{
        id: DEFAULT_USERID_DATA.uid2.id,
        ext: {
          rtiPartner: 'UID2'
        }
      }]
    }, {
      source: 'id5-sync.com',
      uids: [{
        id: DEFAULT_USERID_DATA.id5id.uid
      }]
    }, {
      source: 'intimatemerger.com',
      uids: [{
        id: DEFAULT_USERID_DATA.imuid
      }]
    }, {
      source: '33across.com',
      uids: [{
        id: DEFAULT_USERID_DATA['33acrossId'].envelope
      }]
    }, {
      source: 'criteo.com',
      uids: [{
        id: DEFAULT_USERID_DATA['criteoID'].envelope
      }]
    }, {
      source: 'euid.eu',
      uids: [{
        id: DEFAULT_USERID_DATA['euidID'].envelope
      }]
    }, {
      source: 'google.com',
      uids: [{
        id: DEFAULT_USERID_DATA['pairId'].envelope
      }]
    }
  ];

  const DEFAULT_USERIDASEIDS_DATA = DEFAULT_USERID_PAYLOAD;

  const DEFAULT_USERID_BID_DATA = {
    lotamePanoramaId: 'bd738d136bdaa841117fe9b331bb4'
  };

  const extractPayload = function (bidRequest) { return bidRequest.data }

  const generateEid = function (numEid) {
    const eids = [];

    for (let i = 1; i <= numEid; i++) {
      const newEid = {
        source: `eid_source_${i}.com`,
        uids: [{
          id: `uid_id_${i}`,
        }]
      };

      eids.push(newEid);
    }

    return eids;
  }

  describe('inherited functions', function () {
    it('should exists and is a function', function () {
      const adapter = newBidder(spec);
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('getUserSync tests', function () {
    before(() => {
      // TODO (dgirardi): the assertions in this block rely on
      // global state (consent and siteId) set up in the SOT
      // this is an outsider's attempt to recreate that state more explicitly after shuffling around setup code
      // in this test suite

      // please make your preconditions explicit;
      // also, please, avoid global state if possible.

      spec.buildRequests(DEFAULT_BANNER_VALID_BID, DEFAULT_OPTION);
    })

    it('UserSync test : check type = iframe, check usermatch URL', function () {
      const syncOptions = {
        'iframeEnabled': true
      }
      const userSync = spec.getUserSyncs(syncOptions, []);
      expect(userSync[0].type).to.equal('iframe');
      const USER_SYNC_URL = 'https://js-sec.indexww.com/um/ixmatch.html';
      expect(userSync[0].url).to.equal(USER_SYNC_URL);
    });

    it('When iframeEnabled = false, default to img', function () {
      const syncOptions = {
        'iframeEnabled': false,
      }
      const userSync = spec.getUserSyncs(syncOptions, []);
      expect(userSync[0].type).to.equal('image');
      const USER_SYNC_URL = 'https://dsum.casalemedia.com/pbusermatch?origin=prebid&site_id=123&p=1&i=0&gdpr=1&gdpr_consent=3huaa11=qu3198ae&us_privacy=';
      expect(userSync[0].url).to.equal(USER_SYNC_URL);
    });

    it('UserSync test : check type = pixel, check usermatch URL, no exchange data, only drop 1', function () {
      const syncOptions = {
        'pixelEnabled': true
      }
      config.setConfig({
        userSync: {
          pixelEnabled: true,
          syncsPerBidder: 3
        }
      })
      const userSync = spec.getUserSyncs(syncOptions, []);
      expect(userSync[0].type).to.equal('image');
      const USER_SYNC_URL = 'https://dsum.casalemedia.com/pbusermatch?origin=prebid&site_id=123&p=1&i=0&gdpr=1&gdpr_consent=3huaa11=qu3198ae&us_privacy=';
      expect(userSync[0].url).to.equal(USER_SYNC_URL);
    });

    it('UserSync test : check type = pixel, check usermatch URL with override set to 0', function () {
      const syncOptions = {
        'pixelEnabled': true
      }
      config.setConfig({
        userSync: {
          pixelEnabled: true,
          syncsPerBidder: 3
        }
      });
      const userSync = spec.getUserSyncs(syncOptions, [{ 'body': { 'ext': { 'publishersyncsperbidderoverride': 0 } } }]);
      expect(userSync.length).to.equal(0);
    });

    it('UserSync test : check type = pixel, check usermatch URL with override set', function () {
      const syncOptions = {
        'pixelEnabled': true
      }
      config.setConfig({
        userSync: {
          pixelEnabled: true,
          syncsPerBidder: 3
        }
      });
      const userSync = spec.getUserSyncs(syncOptions, [{ 'body': { 'ext': { 'publishersyncsperbidderoverride': 2 } } }]);
      expect(userSync[0].type).to.equal('image');
      const USER_SYNC_URL_0 = 'https://dsum.casalemedia.com/pbusermatch?origin=prebid&site_id=123&p=2&i=0&gdpr=1&gdpr_consent=3huaa11=qu3198ae&us_privacy=';
      const USER_SYNC_URL_1 = 'https://dsum.casalemedia.com/pbusermatch?origin=prebid&site_id=123&p=2&i=1&gdpr=1&gdpr_consent=3huaa11=qu3198ae&us_privacy=';
      expect(userSync[0].url).to.equal(USER_SYNC_URL_0);
      expect(userSync[1].url).to.equal(USER_SYNC_URL_1);
      expect(userSync.length).to.equal(2);
    });

    it('UserSync test : check type = pixel, check usermatch URL with override greater than publisher syncs per bidder , use syncsperbidder', function () {
      const syncOptions = {
        'pixelEnabled': true
      }
      config.setConfig({
        userSync: {
          pixelEnabled: true,
          syncsPerBidder: 3
        }
      });
      const userSync = spec.getUserSyncs(syncOptions, [{ 'body': { 'ext': { 'publishersyncsperbidderoverride': 4 } } }]);
      expect(userSync[0].type).to.equal('image');
      const USER_SYNC_URL_0 = 'https://dsum.casalemedia.com/pbusermatch?origin=prebid&site_id=123&p=3&i=0&gdpr=1&gdpr_consent=3huaa11=qu3198ae&us_privacy=';
      const USER_SYNC_URL_1 = 'https://dsum.casalemedia.com/pbusermatch?origin=prebid&site_id=123&p=3&i=1&gdpr=1&gdpr_consent=3huaa11=qu3198ae&us_privacy=';
      const USER_SYNC_URL_2 = 'https://dsum.casalemedia.com/pbusermatch?origin=prebid&site_id=123&p=3&i=2&gdpr=1&gdpr_consent=3huaa11=qu3198ae&us_privacy=';
      expect(userSync[0].url).to.equal(USER_SYNC_URL_0);
      expect(userSync[1].url).to.equal(USER_SYNC_URL_1);
      expect(userSync[2].url).to.equal(USER_SYNC_URL_2);
      expect(userSync.length).to.equal(3);
    });

    it('UserSync test : check type = pixel, syncsPerBidder = 0, still use override', function () {
      const syncOptions = {
        'pixelEnabled': true
      }
      config.setConfig({
        userSync: {
          pixelEnabled: true,
          syncsPerBidder: 0
        }
      });
      const userSync = spec.getUserSyncs(syncOptions, [{ 'body': { 'ext': { 'publishersyncsperbidderoverride': 2 } } }]);
      expect(userSync[0].type).to.equal('image');
      const USER_SYNC_URL_0 = 'https://dsum.casalemedia.com/pbusermatch?origin=prebid&site_id=123&p=2&i=0&gdpr=1&gdpr_consent=3huaa11=qu3198ae&us_privacy=';
      const USER_SYNC_URL_1 = 'https://dsum.casalemedia.com/pbusermatch?origin=prebid&site_id=123&p=2&i=1&gdpr=1&gdpr_consent=3huaa11=qu3198ae&us_privacy=';
      expect(userSync[0].url).to.equal(USER_SYNC_URL_0);
      expect(userSync[1].url).to.equal(USER_SYNC_URL_1);
      expect(userSync.length).to.equal(2);
    });
  });

  describe('isBidRequestValid', function () {
    it('should return false if outstream player size is less than 144x144 and IX renderer is preferred', function () {
      const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID[0]);
      bid.mediaTypes.video.context = 'outstream';
      bid.mediaTypes.video.w = [[300, 143]];
      expect(spec.isBidRequestValid(bid)).to.equal(false);
      bid.mediaTypes.video.w = [[143, 300]];
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false if outstream video w & h  is less than 144x144 and IX renderer is preferred', function () {
      const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID[0]);
      bid.mediaTypes.video.context = 'outstream';
      bid.mediaTypes.video.playerSize = [[300, 250]];
      bid.mediaTypes.video.w = 300;
      bid.mediaTypes.video.h = 142;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
      bid.mediaTypes.video.h = 300;
      bid.mediaTypes.video.w = 142;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return true if outstream player size is less than 300x250 and IX renderer is not preferred', function () {
      const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID[0]);
      bid.mediaTypes.video.renderer = {
        url: 'test',
        render: () => { }
      };
      bid.mediaTypes.video.context = 'outstream';
      bid.mediaTypes.video.playerSize = [[300, 249]];
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return true when required params found for a banner, video or native ad', function () {
      expect(spec.isBidRequestValid(DEFAULT_BANNER_VALID_BID[0])).to.equal(true);
      expect(spec.isBidRequestValid(DEFAULT_VIDEO_VALID_BID[0])).to.equal(true);
      expect(spec.isBidRequestValid(DEFAULT_NATIVE_VALID_BID[0])).to.equal(true);
    });

    it('should return true when optional bidFloor params found for an ad', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid.params.bidFloor = 50;
      bid.params.bidFloorCur = 'USD';
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return true when siteID is number', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid.params.siteId = 123;
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when siteID is missing', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      delete bid.params.siteId;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return True when size is missing ', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      delete bid.params.size;
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when size array is wrong length', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid.params.size = [
        300,
        250,
        250
      ];
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when size array is array of strings', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid.params.size = ['300', '250'];
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when mediaTypes.banner does not have sizes', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid.mediaTypes = {
        banner: {
          size: [[300, 250]]
        }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when mediaTypes.video.playerSize does not include params.size', function () {
      const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID[0]);
      bid.mediaTypes = {
        video: {
          playerSize: [[300, 250]]
        }
      };
      bid.params.size = [100, 200];
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return true when mediaTypes.video.playerSize includes params.size', function () {
      const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID[0]);
      bid.mediaTypes = {
        video: {
          playerSize: [[300, 250], [200, 300]]
        }
      };
      bid.params.size = [[300, 250]];
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return true when bid.params.size is missing', function () {
      const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID[0]);
      delete bid.params.size;
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when minduration is missing', function () {
      const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID[0]);
      delete bid.params.video.minduration;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when mediaType is native', function () {
      const bid = utils.deepClone(DEFAULT_NATIVE_VALID_BID[0]);
      delete bid.params.mediaTypes;
      bid.mediaType = 'native';
      bid.sizes = [[300, 250]];
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return true when mediaType is missing and has sizes', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      delete bid.mediaTypes;
      bid.sizes = [[300, 250]];
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return true when mediaType is banner', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      delete bid.mediaTypes;
      bid.mediaType = 'banner';
      bid.sizes = [[300, 250]];
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return true when mediaType is video', function () {
      const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID[0]);
      delete bid.mediaTypes;
      bid.mediaType = 'video';
      bid.sizes = [[400, 100]];
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return true for banner bid when there are multiple mediaTypes (banner, outstream)', function () {
      const bid = utils.deepClone(DEFAULT_MULTIFORMAT_BANNER_VALID_BID[0]);
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return true for video bid when there are multiple mediaTypes (banner, outstream)', function () {
      const bid = utils.deepClone(DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0]);
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('shoult return true for native bid when there are multiple mediaTypes (banner, native)', function () {
      const bid = utils.deepClone(DEFAULT_MULTIFORMAT_NATIVE_VALID_BID[0]);
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });

    it('should return false when there is only bidFloor', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid.params.bidFloor = 50;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when there is only bidFloorCur', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid.params.bidFloorCur = 'USD';
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when bidFloor is string', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid.params.bidFloor = '50';
      bid.params.bidFloorCur = 'USD';
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when bidFloorCur is number', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid.params.bidFloor = 50;
      bid.params.bidFloorCur = 70;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when required video properties are missing on both adunit & param levels', function () {
      const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID[0]);
      delete bid.params.video.mimes;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return true when required video properties are at the adunit level', function () {
      const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID[0]);
      delete bid.params.video.mimes;
      bid.mediaTypes.video.mimes = ['video/mp4'];
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return true if protocols exists but protocol doesn\'t', function () {
      const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID[0]);
      expect(spec.isBidRequestValid(bid)).to.equal(true);
      delete bid.params.video.protocols;
      bid.mediaTypes.video.protocols = 1;
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return true if protocol exists but protocols doesn\'t', function () {
      const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID[0]);
      delete bid.params.video.protocols;
      bid.params.video.protocol = 1;
      expect(spec.isBidRequestValid(bid)).to.equal(true);
      delete bid.params.video.protocol;
      bid.mediaTypes.video.protocol = 1;
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false if both protocol/protocols are missing', function () {
      const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID[0]);
      delete bid.params.video.protocols;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should fail if native openRTB object contains no valid assets', function () {
      const bid = utils.deepClone(DEFAULT_NATIVE_VALID_BID[0]);
      bid.nativeOrtbRequest = {}
      expect(spec.isBidRequestValid(bid)).to.be.false;

      bid.nativeOrtbRequest = { assets: [] }
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });
  });

  describe('buildRequestsIdentity', function () {
    let request;
    let payload;
    let testCopy;

    beforeEach(function () {
      window.headertag = {};
      window.headertag.getIdentityInfo = function () {
        return testCopy;
      };
      request = spec.buildRequests(DEFAULT_BANNER_VALID_BID, DEFAULT_OPTION)[0];
      payload = extractPayload(request);
    });

    afterEach(function () {
      delete window.headertag;
    });

    describe('buildRequestSingleRTI', function () {
      before(function () {
        testCopy = JSON.parse(JSON.stringify(DEFAULT_IDENTITY_RESPONSE));
      });

      it('payload should have correct format and value (single identity partner)', function () {
        expect(payload.user).to.exist;
        expect(payload.user.eids).to.exist;
        expect(payload.user.eids).to.be.an('array');
        expect(payload.user.eids).to.have.lengthOf(1);
      });

      it('identity data in impression should have correct format and value (single identity partner)', function () {
        const impression = payload.user.eids;
        expect(impression).to.be.an('array');
        expect(impression).to.have.lengthOf(1);
        expect(impression[0].source).to.equal(testCopy.IdentityIp.data.source);
        expect(impression[0].uids).to.be.an('array');
        expect(impression[0].uids).to.have.lengthOf(1);
        expect(impression[0].uids[0].id).to.equal(testCopy.IdentityIp.data.uids[0].id);
        expect(impression[0].uids[0].atype).to.exist;
        expect(impression[0].uids[0].atype).to.equal(testCopy.IdentityIp.data.uids[0].atype);
      });
    });

    describe('buildRequestMultipleIds', function () {
      before(function () {
        testCopy = JSON.parse(JSON.stringify(DEFAULT_IDENTITY_RESPONSE));
        testCopy.IdentityIp.data.uids.push(
          {
            id: '1234567'
          },
          {
            id: '2019-04-01TF2:34:41'
          }
        );
      });

      it('payload should have correct format and value (single identity w/ multi ids)', function () {
        expect(payload.user).to.exist;
        expect(payload.user.eids).to.exist;
        expect(payload.user.eids).to.be.an('array');
        expect(payload.user.eids).to.have.lengthOf(1);
      });

      it('identity data in impression should have correct format and value (single identity w/ multi ids)', function () {
        const impression = payload.user.eids;

        expect(impression[0].source).to.equal(testCopy.IdentityIp.data.source);
        expect(impression[0].uids).to.have.lengthOf(3);
      });
    });

    describe('buildRequestMultipleRTI', function () {
      before(function () {
        testCopy = JSON.parse(JSON.stringify(DEFAULT_IDENTITY_RESPONSE));
        testCopy.JackIp = {
          responsePending: false,
          data: {
            source: 'jackinc.com',
            uids: [
              {
                id: 'jackid'
              }
            ]
          }
        }
        testCopy.GenericIp = {
          responsePending: false,
          data: {
            source: 'genericip.com',
            uids: [
              {
                id: 'genericipenvelope'
              }
            ]
          }
        }
      });

      it('payload should have correct format and value (multiple identity partners)', function () {
        expect(payload.user).to.exist;
        expect(payload.user.eids).to.exist;
        expect(payload.user.eids).to.be.an('array');
        expect(payload.user.eids).to.have.lengthOf(3);
      });

      it('identity data in impression should have correct format and value (multiple identity partners)', function () {
        const impression = payload.user.eids;

        expect(impression[0].source).to.equal(testCopy.IdentityIp.data.source);
        expect(impression[0].uids).to.have.lengthOf(1);

        expect(impression[1].source).to.equal(testCopy.JackIp.data.source);
        expect(impression[1].uids).to.have.lengthOf(1);

        expect(impression[2].source).to.equal(testCopy.GenericIp.data.source);
        expect(impression[2].uids).to.have.lengthOf(1);
      });
    });

    describe('buildRequestNoData', function () {
      beforeEach(function () {
        testCopy = JSON.parse(JSON.stringify(DEFAULT_IDENTITY_RESPONSE));
      });

      it('payload should not have any user eids with an undefined identity data response', function () {
        window.headertag.getIdentityInfo = function () {
          return undefined;
        };
        request = spec.buildRequests(DEFAULT_BANNER_VALID_BID, DEFAULT_OPTION)[0];
        payload = extractPayload(request);

        expect(payload.user).to.exist;
        expect(payload.user.eids).to.not.exist;
      });

      it('payload should have user eids if least one partner data is available', function () {
        testCopy.GenericIp = {
          responsePending: true,
          data: {}
        }
        request = spec.buildRequests(DEFAULT_BANNER_VALID_BID, DEFAULT_OPTION)[0];
        payload = extractPayload(request);

        expect(payload.user).to.exist;
        expect(payload.user.eids).to.exist;
      });

      it('payload should not have any user eids if identity data is pending for all partners', function () {
        testCopy.IdentityIp.responsePending = true;
        request = spec.buildRequests(DEFAULT_BANNER_VALID_BID, DEFAULT_OPTION)[0];
        payload = extractPayload(request);

        expect(payload.user).to.exist;
        expect(payload.user.eids).to.not.exist;
      });

      it('payload should not have any user eids if identity data is pending or not available for all partners', function () {
        testCopy.IdentityIp.responsePending = false;
        testCopy.IdentityIp.data = {};
        request = spec.buildRequests(DEFAULT_BANNER_VALID_BID, DEFAULT_OPTION)[0];
        payload = extractPayload(request);

        expect(payload.user).to.exist;
        expect(payload.user.eids).to.not.exist;
      });
    });
  });

  describe('buildRequestsUserId', function () {
    let validIdentityResponse;
    let validUserIdPayload;
    const serverResponse = {
      body: {
        ext: {
          pbjs_allow_all_eids: {
            activated: true
          }
        }
      }
    };

    beforeEach(function () {
      window.headertag = {};
      window.headertag.getIdentityInfo = function () {
        return validIdentityResponse;
      };
    });

    afterEach(function () {
      delete window.headertag;
      validIdentityResponse = {}
    });

    it('IX adapter reads supported user modules from Prebid and adds it to Video', function () {
      const cloneValidBid = utils.deepClone(DEFAULT_VIDEO_VALID_BID);
      cloneValidBid[0].userIdAsEids = utils.deepClone(DEFAULT_USERIDASEIDS_DATA);
      const request = spec.buildRequests(cloneValidBid, DEFAULT_OPTION)[0];
      const payload = extractPayload(request);
      expect(payload.user.eids).to.have.lengthOf(11);
      expect(payload.user.eids).to.have.deep.members(DEFAULT_USERID_PAYLOAD);
    });

    it('IX adapter filters eids from prebid past the maximum eid limit', function () {
      const cloneValidBid = utils.deepClone(DEFAULT_VIDEO_VALID_BID);
      const eid_sent_from_prebid = generateEid(55);
      cloneValidBid[0].userIdAsEids = utils.deepClone(eid_sent_from_prebid);
      const request = spec.buildRequests(cloneValidBid, DEFAULT_OPTION)[0];
      const payload = extractPayload(request);
      expect(payload.user.eids).to.have.lengthOf(50);
      const eid_accepted = eid_sent_from_prebid.slice(0, 50);
      expect(payload.user.eids).to.have.deep.members(eid_accepted);
      expect(payload.ext.ixdiag.eidLength).to.equal(55);
    });

    it('IX adapter filters eids from IXL past the maximum eid limit', function () {
      validIdentityResponse = {
        MerkleIp: {
          responsePending: false,
          data: {
            source: 'merkle.com',
            uids: [{
              id: '1234-5678-9012-3456',
              ext: {
                keyID: '1234-5678',
                enc: 1
              }
            }]
          }
        },
        LiveIntentIp: {
          responsePending: false,
          data: {
            source: 'liveintent.com',
            uids: [{
              id: '1234-5678-9012-3456',
              ext: {
                keyID: '1234-5678',
                rtiPartner: 'LDID',
                enc: 1
              }
            }]
          }
        }
      };
      const cloneValidBid = utils.deepClone(DEFAULT_VIDEO_VALID_BID);
      const eid_sent_from_prebid = generateEid(49);
      cloneValidBid[0].userIdAsEids = utils.deepClone(eid_sent_from_prebid);
      const request = spec.buildRequests(cloneValidBid, DEFAULT_OPTION)[0];
      const payload = extractPayload(request);
      expect(payload.user.eids).to.have.lengthOf(50);
      eid_sent_from_prebid.push({
        source: 'merkle.com',
        uids: [{
          id: '1234-5678-9012-3456',
          ext: {
            keyID: '1234-5678',
            enc: 1
          }
        }]
      })
      expect(payload.user.eids).to.have.deep.members(eid_sent_from_prebid);
      expect(payload.ext.ixdiag.eidLength).to.equal(49);
    });

    it('Has incoming eids with no uid', function () {
      const cloneValidBid = utils.deepClone(DEFAULT_VIDEO_VALID_BID);
      const eid_sent_from_prebid = [
        {
          source: 'catijah.org'
        },
        {
          source: 'bagel.com'
        }
      ];
      cloneValidBid[0].userIdAsEids = utils.deepClone(eid_sent_from_prebid);
      const request = spec.buildRequests(cloneValidBid, DEFAULT_OPTION)[0];
      const payload = extractPayload(request);
      expect(payload.user.eids).to.be.undefined
      expect(payload.ext.ixdiag.eidLength).to.equal(2);
    });

    it('We continue to send in IXL identity info and Prebid takes precedence over IXL', function () {
      validIdentityResponse = {
        AdserverOrgIp: {
          responsePending: false,
          data: {
            source: 'adserver.org',
            uids: [
              {
                id: '1234-5678-9012-3456',
                ext: {
                  rtiPartner: 'TDID'
                }
              },
              {
                id: 'FALSE',
                ext: {
                  rtiPartner: 'TDID_LOOKUP'
                }
              },
              {
                id: '2020-06-24T14:43:48.860Z',
                ext: {
                  rtiPartner: 'TDID_CREATED_AT'
                }
              }
            ]
          }
        },
        MerkleIp: {
          responsePending: false,
          data: {
            source: 'merkle.com',
            uids: [{
              id: '1234-5678-9012-3456',
              ext: {
                keyID: '1234-5678',
                enc: 1
              }
            }]
          }
        },
        LiveRampIp: {
          source: 'liveramp.com',
          uids: [
            {
              id: '0000-1234-4567-8901',
              ext: {
                rtiPartner: 'idl'
              }
            }
          ]
        },
        NetIdIp: {
          source: 'netid.de',
          uids: [
            {
              id: 'testnetid',
              ext: {
                rtiPartner: 'NETID'
              }
            }
          ]
        },
        NeustarIp: {
          source: 'neustar.biz',
          uids: [
            {
              id: 'testfabrick',
              ext: {
                rtiPartner: 'fabrickId'
              }
            }
          ]
        },
        ZeotapIp: {
          source: 'zeotap.com',
          uids: [
            {
              id: 'testzeotap',
              ext: {
                rtiPartner: 'zeotapIdPlus'
              }
            }
          ]
        }
      };

      const cloneValidBid = utils.deepClone(DEFAULT_BANNER_VALID_BID);
      cloneValidBid[0].userIdAsEids = utils.deepClone(DEFAULT_USERIDASEIDS_DATA);

      const request = spec.buildRequests(cloneValidBid, DEFAULT_OPTION)[0];
      const payload = extractPayload(request);

      validUserIdPayload = utils.deepClone(DEFAULT_USERID_PAYLOAD);
      validUserIdPayload.push({
        source: 'merkle.com',
        uids: [{
          id: '1234-5678-9012-3456',
          ext: {
            keyID: '1234-5678',
            enc: 1
          }
        }]
      })
      validUserIdPayload.push({
        source: 'adserver.org',
        uids: [
          {
            id: '1234-5678-9012-3456',
            ext: {
              rtiPartner: 'TDID'
            }
          },
          {
            id: 'FALSE',
            ext: {
              rtiPartner: 'TDID_LOOKUP'
            }
          },
          {
            id: '2020-06-24T14:43:48.860Z',
            ext: {
              rtiPartner: 'TDID_CREATED_AT'
            }
          }
        ]
      })

      expect(payload.user).to.exist;
      expect(payload.user.eids).to.have.lengthOf(13);

      expect(payload.user.eids).to.have.deep.members(validUserIdPayload);
    });

    it('IXL and Prebid are mutually exclusive', function () {
      validIdentityResponse = {
        LiveIntentIp: {
          responsePending: false,
          data: {
            source: 'liveintent.com',
            uids: [{
              id: '1234-5678-9012-3456',
              ext: {
                keyID: '1234-5678',
                rtiPartner: 'LDID',
                enc: 1
              }
            }]
          }
        }
      };

      const cloneValidBid = utils.deepClone(DEFAULT_VIDEO_VALID_BID);
      cloneValidBid[0].userIdAsEids = utils.deepClone(DEFAULT_USERIDASEIDS_DATA);

      const request = spec.buildRequests(cloneValidBid, DEFAULT_OPTION)[0];

      validUserIdPayload = utils.deepClone(DEFAULT_USERID_PAYLOAD);
      validUserIdPayload.push({
        source: 'liveintent.com',
        uids: [{
          id: '1234-5678-9012-3456',
          ext: {
            keyID: '1234-5678',
            rtiPartner: 'LDID',
            enc: 1
          }
        }]
      });

      const payload = extractPayload(request);
      expect(payload.user.eids).to.have.lengthOf(12);
      expect(payload.user.eids).to.have.deep.members(validUserIdPayload);
    });
  });

  describe('First party data', function () {
    it('should not set ixdiag.fpd value if not defined', function () {
      const request = spec.buildRequests(DEFAULT_BANNER_VALID_BID, { ortb2: {} })[0];
      const r = extractPayload(request);

      expect(r.ext.ixdiag.fpd).to.be.undefined;
    });

    it('should set ixdiag.fpd value if it exists using ortb2', function () {
      const ortb2 = {
        site: {
          ext: {
            data: {
              pageType: 'article'
            }
          }
        }
      };

      const request = spec.buildRequests(DEFAULT_BANNER_VALID_BID, { ortb2 })[0];
      const r = extractPayload(request);

      expect(r.ext.ixdiag.fpd).to.exist;
    });

    it('should set ixdiag.tmax value from bidderRequest overriding global config bidderTimeout', function () {
      config.setConfig({
        bidderTimeout: 250
      });

      const request = spec.buildRequests(DEFAULT_BANNER_VALID_BID, { timeout: 1234 })[0];
      const r = extractPayload(request);

      expect(r.ext.ixdiag.tmax).to.equal(1234);
    });

    it('should not set ixdiag.tmax value if bidderTimeout is undefined', function () {
      config.setConfig({
        bidderTimeout: null
      })
      const request = spec.buildRequests(DEFAULT_BANNER_VALID_BID)[0];
      const r = extractPayload(request);

      expect(r.ext.ixdiag.tmax).to.be.undefined
    });

    it('should set ixdiag.imps to number of impressions', function () {
      const request = spec.buildRequests(DEFAULT_BANNER_VALID_BID)[0];
      const r = extractPayload(request);

      expect(r.ext.ixdiag.imps).to.equal(1);
    });

    it('should not send information that is not part of openRTB spec v2.5 using ortb2', function () {
      const ortb2 = {
        site: {
          keywords: 'power tools, drills',
          search: 'drill',
          testProperty: 'test_string'
        },
        user: {
          keywords: ['a'],
          testProperty: 'test_string'
        }
      };

      const request = spec.buildRequests(DEFAULT_BANNER_VALID_BID, { ortb2 })[0];
      const r = extractPayload(request);

      expect(r.site.keywords).to.exist;
      expect(r.site.search).to.exist;
      expect(r.site.testProperty).to.be.undefined;
      expect(r.user.keywords).to.exist;
      expect(r.user.testProperty).to.be.undefined;
    });

    it('should set dsa field when defined', function () {
      const dsa = {
        dsarequired: 3,
        pubrender: 0,
        datatopub: 2,
        transparency: [{
          domain: 'domain.com',
          dsaparams: [1]
        }]
      }
      const request = spec.buildRequests(DEFAULT_BANNER_VALID_BID, { ortb2: {regs: {
        ext: {
          dsa: deepClone(dsa)
        }
      }
      }})[0];
      const r = extractPayload(request);

      expect(r.regs.ext.dsa.dsarequired).to.equal(dsa.dsarequired);
      expect(r.regs.ext.dsa.pubrender).to.equal(dsa.pubrender);
      expect(r.regs.ext.dsa.datatopub).to.equal(dsa.datatopub);
      expect(r.regs.ext.dsa.transparency).to.be.an('array');
      expect(r.regs.ext.dsa.transparency).to.have.deep.members(dsa.transparency);
    });
    it('should not set dsa fields when fields arent appropriately defined', function () {
      const dsa = {
        dsarequired: '3',
        pubrender: '0',
        datatopub: '2',
        transparency: 20
      }
      const request = spec.buildRequests(DEFAULT_BANNER_VALID_BID, { ortb2: {regs: {
        ext: {
          dsa: deepClone(dsa)
        }
      }
      }})[0];
      const r = extractPayload(request);

      expect(r.regs).to.be.undefined;
    });
    it('should not set dsa transparency when fields arent appropriately defined', function () {
      const dsa = {
        transparency: [{
          domain: 3,
          dsaparams: [1]
        },
        {
          domain: 'domain.com',
          dsaparams: 'params'
        },
        {
          domain: 'domain.com',
          dsaparams: ['1']
        }]
      }
      const request = spec.buildRequests(DEFAULT_BANNER_VALID_BID, { ortb2: {regs: {
        ext: {
          dsa: deepClone(dsa)
        }
      }
      }})[0];
      const r = extractPayload(request);

      expect(r.regs).to.be.undefined;
    });
    it('should set gpp and gpp_sid field when defined', function () {
      const request = spec.buildRequests(DEFAULT_BANNER_VALID_BID, { ortb2: {regs: {gpp: 'gpp', gpp_sid: [1]}} })[0];
      const r = extractPayload(request);

      expect(r.regs.gpp).to.equal('gpp');
      expect(r.regs.gpp_sid).to.be.an('array');
      expect(r.regs.gpp_sid).to.include(1);
    });
    it('should not set gpp, gpp_sid and dsa field when not defined', function () {
      const request = spec.buildRequests(DEFAULT_BANNER_VALID_BID, { ortb2: {regs: {}} })[0];
      const r = extractPayload(request);

      expect(r.regs).to.be.undefined;
    });
    it('should not set gpp and gpp_sid field when fields arent strings or array defined', function () {
      const request = spec.buildRequests(DEFAULT_BANNER_VALID_BID, { ortb2: {regs: {gpp: 1, gpp_sid: 'string'}} })[0];
      const r = extractPayload(request);

      expect(r.regs).to.be.undefined;
    });
    it('should set gpp info from module when it exists', function () {
      const options = {
        gppConsent: {
          gppString: 'gpp',
          applicableSections: [1]
        }
      };
      const request = spec.buildRequests(DEFAULT_BANNER_VALID_BID, options);
      const r = extractPayload(request[0]);

      expect(r.regs.gpp).to.equal('gpp');
      expect(r.regs.gpp_sid).to.be.an('array');
      expect(r.regs.gpp_sid).to.include(1);
    });

    it('should add adunit specific data to imp ext for banner', function () {
      const AD_UNIT_CODE = '/19968336/some-adunit-path';
      const validBids = utils.deepClone(DEFAULT_BANNER_VALID_BID);
      validBids[0].ortb2Imp = {
        ext: {
          data: {
            adserver: {
              name: 'gam banner',
              adslot: AD_UNIT_CODE
            }
          }
        }
      };
      const requests = spec.buildRequests(validBids, DEFAULT_OPTION);
      const imp = extractPayload(requests[0]).imp[0];
      expect(deepAccess(imp, 'ext.data.adserver.name')).to.equal('gam banner');
      expect(deepAccess(imp, 'ext.data.adserver.adslot')).to.equal(AD_UNIT_CODE);
    });

    it('should add adunit specific data to imp ext for native', function () {
      const AD_UNIT_CODE = '/19968336/some-adunit-path';
      const validBids = utils.deepClone(DEFAULT_NATIVE_VALID_BID);
      validBids[0].ortb2Imp = {
        ext: {
          data: {
            adserver: {
              name: 'gam native',
              adslot: AD_UNIT_CODE
            }
          }
        }
      };
      const requests = spec.buildRequests(validBids, DEFAULT_OPTION);
      const imp = extractPayload(requests[0]).imp[0];
      expect(deepAccess(imp, 'ext.data.adserver.name')).to.equal('gam native');
      expect(deepAccess(imp, 'ext.data.adserver.adslot')).to.equal(AD_UNIT_CODE);
    });

    it('should add adunit specific data to imp ext for video', function () {
      const AD_UNIT_CODE = '/19968336/some-adunit-path';
      const validBids = utils.deepClone(DEFAULT_VIDEO_VALID_BID);
      validBids[0].ortb2Imp = {
        ext: {
          data: {
            adserver: {
              name: 'gam video',
              adslot: AD_UNIT_CODE
            }
          }
        }
      };
      const requests = spec.buildRequests(validBids, DEFAULT_OPTION);
      const imp = extractPayload(requests[0]).imp[0];
      expect(deepAccess(imp, 'ext.data.adserver.name')).to.equal('gam video');
      expect(deepAccess(imp, 'ext.data.adserver.adslot')).to.equal(AD_UNIT_CODE);
    });
  });

  describe('buildRequests', function () {
    const bidWithoutSchain = utils.deepClone(DEFAULT_BANNER_VALID_BID);
    if (bidWithoutSchain[0].ortb2 && bidWithoutSchain[0].ortb2.source && bidWithoutSchain[0].ortb2.source.ext) {
      delete bidWithoutSchain[0].ortb2.source.ext.schain;
    }
    const GPID = '/19968336/some-adunit-path';
    let request, requestUrl, requestMethod, payloadData, requestWithoutSchain, payloadWithoutSchain;

    before(() => {
      request = spec.buildRequests(DEFAULT_BANNER_VALID_BID, DEFAULT_OPTION)[0];
      requestUrl = request.url;
      requestMethod = request.method;
      payloadData = request.data;
      requestWithoutSchain = spec.buildRequests(bidWithoutSchain, DEFAULT_OPTION)[0];
      payloadWithoutSchain = extractPayload(requestWithoutSchain);
    });

    it('request should be made to IX endpoint with POST method and siteId in query param', function () {
      expect(requestMethod).to.equal('POST');
      expect(requestUrl).to.equal(IX_SECURE_ENDPOINT + '?s=' + DEFAULT_BANNER_VALID_BID[0].params.siteId);
    });

    it('request made to IX endpoint with POST method should have correct options fields set', function () {
      expect(request.options.contentType).to.equal('text/plain')
      expect(request.options.withCredentials).to.equal(true)
    });

    it('auction type should be set correctly', function () {
      const at = payloadData.at;
      expect(at).to.equal(1);
    })

    it('should send dfp_adunit_code in request if ortb2Imp.ext.data.adserver.adslot exists', function () {
      const AD_UNIT_CODE = '/19968336/some-adunit-path';
      const validBids = utils.deepClone(DEFAULT_BANNER_VALID_BID);
      validBids[0].ortb2Imp = {
        ext: {
          data: {
            adserver: {
              name: 'gam',
              adslot: AD_UNIT_CODE
            }
          }
        }
      };
      const requests = spec.buildRequests(validBids, DEFAULT_OPTION);
      const { ext: { dfp_ad_unit_code } } = extractPayload(requests[0]).imp[0];
      expect(dfp_ad_unit_code).to.equal(AD_UNIT_CODE);
    });

    it('should send gpid in request if ortb2Imp.ext.gpid exists', function () {
      const validBids = utils.deepClone(DEFAULT_BANNER_VALID_BID);
      validBids[0].ortb2Imp = {
        ext: {
          gpid: GPID
        }
      };
      const requests = spec.buildRequests(validBids, DEFAULT_OPTION);
      const { ext: { gpid } } = extractPayload(requests[0]).imp[0];
      expect(gpid).to.equal(GPID);
    });

    it('should send gpid in request if ortb2Imp.ext.gpid exists when no size present', function () {
      const validBids = utils.deepClone(DEFAULT_BANNER_VALID_BID_PARAM_NO_SIZE);
      validBids[0].ortb2Imp = {
        ext: {
          gpid: GPID
        }
      };
      const requests = spec.buildRequests(validBids, DEFAULT_OPTION);
      const { ext: { gpid } } = extractPayload(requests[0]).imp[0];
      expect(gpid).to.equal(GPID);
    });

    it('should not send dfp_adunit_code in request if ortb2Imp.ext.data.adserver.adslot does not exists', function () {
      const GPID = '/19968336/some-adunit-path';
      const validBids = utils.deepClone(DEFAULT_BANNER_VALID_BID);
      validBids[0].ortb2Imp = {
        ext: {
          gpid: GPID
        }
      };
      const requests = spec.buildRequests(validBids, DEFAULT_OPTION);
      const imp = extractPayload(requests[0]).imp[0];
      expect(deepAccess(imp, 'ext.dfp_ad_unit_code')).to.not.exist;
    });

    it('should not send gpid in request if ortb2Imp.ext.gpid does not exists', function () {
      const AD_UNIT_CODE = '/19968336/some-adunit-path';
      const validBids = utils.deepClone(DEFAULT_BANNER_VALID_BID);
      validBids[0].ortb2Imp = {
        ext: {
          data: {
            adserver: {
              name: 'gam',
              adslot: AD_UNIT_CODE
            }
          }
        }
      };
      const requests = spec.buildRequests(validBids, DEFAULT_OPTION);
      const imp = extractPayload(requests[0]).imp[0];
      expect(deepAccess(imp, 'ext.gpid')).to.not.exist;
    });

    it('should send gpid & dfp_adunit_code if they exist in ortb2Imp.ext', function () {
      const AD_UNIT_CODE = '/1111/home';
      const GPID = '/1111/home-left';
      const validBids = utils.deepClone(DEFAULT_BANNER_VALID_BID);
      validBids[0].ortb2Imp = {
        ext: {
          gpid: GPID,
          data: {
            adserver: {
              name: 'gam',
              adslot: AD_UNIT_CODE
            }
          }
        }
      };
      const requests = spec.buildRequests(validBids, DEFAULT_OPTION);
      const imp = extractPayload(requests[0]).imp[0];
      expect(deepAccess(imp, 'ext.gpid')).to.equal(GPID);
      expect(deepAccess(imp, 'ext.dfp_ad_unit_code')).to.equal(AD_UNIT_CODE);
    });

    it('payload should have correct format and value', function () {
      const payload = payloadData;
      expect(payload.id).to.equal(DEFAULT_BANNER_VALID_BID[0].bidderRequestId);
      expect(payload.id).to.be.a('string');
      expect(payload.site.page).to.equal(DEFAULT_OPTION.refererInfo.page);
      expect(payload.site.ref).to.equal(document.referrer);
      expect(payload.ext.source).to.equal('prebid');
      expect(payload.source.ext.schain).to.deep.equal(SAMPLE_SCHAIN);
      expect(payload.imp).to.be.an('array');
      expect(payload.imp).to.have.lengthOf(1);
      expect(payload.source.tid).to.equal(DEFAULT_OPTION.ortb2.source.tid);
    });

    it('payload should have correct format and value for r.id when bidderRequestId is a number ', function () {
      const bidWithIntId = utils.deepClone(DEFAULT_BANNER_VALID_BID);
      bidWithIntId[0].bidderRequestId = 123456;

      request = spec.buildRequests(bidWithIntId, DEFAULT_OPTION)[0];

      const payload = extractPayload(request);
      expect(bidWithIntId[0].bidderRequestId).to.be.a('number');
      expect(payload.id).to.equal(bidWithIntId[0].bidderRequestId.toString());
      expect(payload.id).to.be.a('string');
    });

    it('payload should have correct format and value for r.id when bidderRequestId is a number ', function () {
      const bidWithIntId = utils.deepClone(DEFAULT_BANNER_VALID_BID);
      bidWithIntId[0].bidderRequestId = 123456;

      request = spec.buildRequests(bidWithIntId, DEFAULT_OPTION)[0];

      const payload = extractPayload(request);
      expect(bidWithIntId[0].bidderRequestId).to.be.a('number');
      expect(payload.id).to.equal(bidWithIntId[0].bidderRequestId.toString());
      expect(payload.id).to.be.a('string');
    });

    it('payload should not include schain when not provided', function () {
      const payload = payloadWithoutSchain;

      const actualSchain = (((payload || {}).source || {}).ext || {}).schain;
      expect(actualSchain).to.not.exist;
    });

    it('impression should have correct format and value', function () {
      const impression = payloadData.imp[0];
      const sidValue = DEFAULT_BANNER_VALID_BID[0].params.id;

      expect(impression.id).to.equal(DEFAULT_BANNER_VALID_BID[0].bidId);
      expect(impression.banner.format).to.be.length(2);
      expect(impression.banner.topframe).to.be.oneOf([0, 1]);
      expect(impression.banner.pos).to.equal(0);
      expect(impression.ext.tid).to.equal(DEFAULT_BANNER_VALID_BID[0].transactionId);
      expect(impression.ext.sid).to.equal(sidValue);

      impression.banner.format.map(({ w, h, ext }, index) => {
        const size = DEFAULT_BANNER_VALID_BID[0].mediaTypes.banner.sizes[index];

        expect(w).to.equal(size[0]);
        expect(h).to.equal(size[1]);
        expect(ext.siteID).to.equal(DEFAULT_BANNER_VALID_BID[0].params.siteId);
      });
    });

    it('payload should have imp[].banner.format[].ext.siteID as string ', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid.params.siteId = 1234;

      request = spec.buildRequests([bid], DEFAULT_OPTION)[0];

      const payload = extractPayload(request);
      payload.imp[0].banner.format.forEach((imp) => {
        expect(imp.ext.siteID).to.be.a('string');
      });
    });

    it('multi-configured size params should have the correct imp[].banner.format[].ext.siteID', function () {
      const bid1 = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      const bid2 = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid1.params.siteId = 1234;
      bid1.bidId = '27fc897708d826';
      bid2.params.siteId = 4321;
      bid2.bidId = '34df030c33dc68';
      bid2.params.size = [300, 600];
      request = spec.buildRequests([bid1, bid2], DEFAULT_OPTION)[0];

      const payload = extractPayload(request);
      expect(payload.imp[0].banner.format[0].ext.siteID).to.equal('1234');
      expect(payload.imp[0].banner.format[1].ext.siteID).to.equal('4321');
    });

    it('multi-configured size params should be added to the imp[].banner.format[] array', function () {
      const bid1 = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      const bid2 = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid1.params.siteId = 1234;
      bid1.bidId = '27fc897708d826';
      bid2.params.siteId = 4321;
      bid2.bidId = '34df030c33dc68';
      bid2.params.size = [300, 600];
      request = spec.buildRequests([bid1, bid2], DEFAULT_OPTION)[0];

      const payload = extractPayload(request);
      expect(payload.imp[0].banner.format.length).to.equal(2);
      expect(`${payload.imp[0].banner.format[0].w}x${payload.imp[0].banner.format[0].h}`).to.equal('300x250');
      expect(`${payload.imp[0].banner.format[1].w}x${payload.imp[0].banner.format[1].h}`).to.equal('300x600');
    });

    describe('build requests with price floors', () => {
      const highFloor = 4.5;
      const lowFloor = 3.5;
      const currency = 'USD';

      it('video impression should contain floors from priceFloors module', function () {
        const bid = utils.deepClone(ONE_VIDEO[0]);
        const expectedFloor = 3.25;
        bid.getFloor = () => ({ floor: expectedFloor, currency });
        const request = spec.buildRequests([bid], {})[0];
        const impression = extractPayload(request).imp[0];

        expect(impression.bidfloor).to.equal(expectedFloor);
        expect(impression.bidfloorcur).to.equal(currency);
        expect(impression.ext.fl).to.equal('p');
      });

      it('banner impression should contain floors from priceFloors module', function () {
        const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0])
        const expectedFloor = 3.25;
        bid.getFloor = () => ({ floor: expectedFloor, currency });
        const request = spec.buildRequests([bid], {})[0];
        const impression = extractPayload(request).imp[0];

        expect(impression.bidfloor).to.equal(expectedFloor);
        expect(impression.bidfloorcur).to.equal(currency);
        expect(impression.banner.format[0].ext.fl).to.equal('p');
      });

      it('should default to ix floors when priceFloors Module is not implemented', function () {
        const bid = utils.deepClone(ONE_BANNER[0]);
        bid.params.bidFloor = highFloor;
        bid.params.bidFloorCur = 'USD'
        const request = spec.buildRequests([bid], {})[0];
        const impression = extractPayload(request).imp[0];

        expect(impression.bidfloor).to.equal(highFloor);
        expect(impression.bidfloorcur).to.equal(bid.params.bidFloorCur);
        expect(impression.banner.format[0].ext.fl).to.equal('x');
      });

      it('should prioritize priceFloors Module over IX param floors', function () {
        const bid = utils.deepClone(ONE_BANNER[0]);
        bid.params.bidFloor = lowFloor;
        bid.params.bidFloorCur = 'USD';
        const expectedFloor = highFloor;
        bid.getFloor = () => ({ floor: expectedFloor, currency });
        const requestBidFloor = spec.buildRequests([bid], {})[0];
        const impression = extractPayload(requestBidFloor).imp[0];

        expect(impression.bidfloor).to.equal(highFloor);
        expect(impression.bidfloorcur).to.equal(bid.params.bidFloorCur);
        expect(impression.banner.format[0].ext.fl).to.equal('p');
      });

      it('impression should have bidFloor and bidFloorCur if configured', function () {
        const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
        bid.params.bidFloor = 50;
        bid.params.bidFloorCur = 'USD';
        const requestBidFloor = spec.buildRequests([bid], {})[0];
        const impression = extractPayload(requestBidFloor).imp[0];

        expect(impression.bidfloor).to.equal(bid.params.bidFloor);
        expect(impression.bidfloorcur).to.equal(bid.params.bidFloorCur);
        expect(impression.banner.format[0].ext.fl).to.equal('x');
      });

      it('banner multi size impression should have bidFloor both in imp and format ext objects', function () {
        const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
        bid.params.bidFloor = 50;
        bid.params.bidFloorCur = 'USD';
        const requestBidFloor = spec.buildRequests([bid], {})[0];
        const impression = extractPayload(requestBidFloor).imp[0];

        expect(impression.bidfloor).to.equal(bid.params.bidFloor);
        expect(impression.bidfloorcur).to.equal(bid.params.bidFloorCur);
        expect(impression.banner.format[0].ext.bidfloor).to.equal(50);
      });

      it('missing sizes impressions should contain floors from priceFloors module ', function () {
        const bid = utils.deepClone(ONE_BANNER[0]);
        bid.mediaTypes.banner.sizes.push([500, 400])

        const expectedFloor = 3.25;
        bid.getFloor = () => ({ floor: expectedFloor, currency });

        sinon.spy(bid, 'getFloor');

        const requestBidFloor = spec.buildRequests([bid], {})[0];
        expect(bid.getFloor.getCall(0).args[0].mediaType).to.equal('banner');
        expect(bid.getFloor.getCall(0).args[0].size[0]).to.equal(300);
        expect(bid.getFloor.getCall(0).args[0].size[1]).to.equal(250);

        expect(bid.getFloor.getCall(1).args[0].mediaType).to.equal('banner');
        expect(bid.getFloor.getCall(1).args[0].size[0]).to.equal(500);
        expect(bid.getFloor.getCall(1).args[0].size[1]).to.equal(400);

        const impression = extractPayload(requestBidFloor).imp[0];
        expect(impression.bidfloor).to.equal(expectedFloor);
        expect(impression.bidfloorcur).to.equal(currency);
      });

      it('banner impressions should have pricefloors in AdUnit', function () {
        const bid = utils.deepClone(ONE_BANNER[0]);

        const expectedFloor = 4.3;
        bid.floors = {
          currency: 'USD',
          schema: {
            delimiter: '|',
            fields: ['mediaType', 'size']
          },
          values: {
            'banner|300x250': expectedFloor,
            'banner|600x500': 6.5,
            'banner|*': 7.5
          }
        };
        bid.getFloor = () => ({ floor: expectedFloor, currency });

        sinon.spy(bid, 'getFloor');

        const requestBidFloor = spec.buildRequests([bid], {})[0];
        expect(bid.getFloor.getCall(0).args[0].mediaType).to.equal('banner');
        expect(bid.getFloor.getCall(0).args[0].size[0]).to.equal(300);
        expect(bid.getFloor.getCall(0).args[0].size[1]).to.equal(250);

        const impression = extractPayload(requestBidFloor).imp[0];
        expect(impression.bidfloor).to.equal(expectedFloor);
        expect(impression.bidfloorcur).to.equal(currency);
      });
    });

    it('impression should have sid if id is configured as number', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid.params.id = 50;
      const requestBidFloor = spec.buildRequests([bid], {})[0];
      const impression = extractPayload(requestBidFloor).imp[0];

      expect(impression.id).to.equal(DEFAULT_BANNER_VALID_BID[0].bidId);
      expect(impression.banner.format[0].w).to.equal(DEFAULT_BANNER_VALID_BID[0].params.size[0]);
      expect(impression.banner.format[0].h).to.equal(DEFAULT_BANNER_VALID_BID[0].params.size[1]);
      expect(impression.banner.topframe).to.be.oneOf([0, 1]);
      expect(impression.banner.format[0].ext.siteID).to.equal(DEFAULT_BANNER_VALID_BID[0].params.siteId);
      expect(impression.ext.sid).to.equal('50');
    });

    it('impression should have sid if id is configured as string', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid.params.id = 'abc';
      const requestBidFloor = spec.buildRequests([bid], {})[0];
      const impression = extractPayload(requestBidFloor).imp[0];

      expect(impression.id).to.equal(DEFAULT_BANNER_VALID_BID[0].bidId);
      expect(impression.banner.format[0].w).to.equal(DEFAULT_BANNER_VALID_BID[0].params.size[0]);
      expect(impression.banner.format[0].h).to.equal(DEFAULT_BANNER_VALID_BID[0].params.size[1]);
      expect(impression.banner.topframe).to.be.oneOf([0, 1]);
      expect(impression.banner.format[0].ext.siteID).to.equal(DEFAULT_BANNER_VALID_BID[0].params.siteId);
      expect(impression.ext.sid).to.equal('abc');
    });

    describe('first party data', () => {
      beforeEach(() => {
        config.resetConfig();
      });

      it('should add first party data to page url in bid request if it exists in config', function () {
        config.setConfig({
          ix: {
            firstPartyData: {
              ab: 123,
              cd: '123#ab',
              'e/f': 456,
              'h?g': '456#cd'
            }
          }
        });

        const requestWithFirstPartyData = spec.buildRequests(DEFAULT_BANNER_VALID_BID, DEFAULT_OPTION)[0];
        const pageUrl = extractPayload(requestWithFirstPartyData).site.page;
        const expectedPageUrl = DEFAULT_OPTION.ortb2.site.page + '/?ab=123&cd=123%23ab&e%2Ff=456&h%3Fg=456%23cd';
        expect(pageUrl).to.equal(expectedPageUrl);
      });

      it('should set device sua if available in fpd and request size does not exceed limit', function () {
        const ortb2 = {
          device: {
            sua: {
              platform: {
                brand: 'macOS',
                version: [ '12', '6', '1' ]
              },
              browsers: [
                {
                  brand: 'Chromium',
                  version: [ '107', '0', '5249', '119' ]
                },
                {
                  brand: 'Google Chrome',
                  version: [ '107', '0', '5249', '119' ]
                },
              ],
              mobile: 0,
              model: ''
            }
          }};

        const request = spec.buildRequests(DEFAULT_BANNER_VALID_BID, { ortb2 })[0];
        const payload = extractPayload(request);
        expect(payload.device.sua.platform.brand).to.equal('macOS')
        expect(payload.device.sua.mobile).to.equal(0)
      });

      it('should not set device sua if not available in fpd', function () {
        const ortb2 = {
          device: {}};

        const request = spec.buildRequests(DEFAULT_BANNER_VALID_BID, { ortb2 })[0];
        const payload = extractPayload(request);
        expect(payload.device.h).to.exist;
        expect(payload.device.w).to.exist;
      });

      it('should not set first party data if it is not an object', function () {
        config.setConfig({
          ix: {
            firstPartyData: 500
          }
        });

        const requestFirstPartyDataNumber = spec.buildRequests(DEFAULT_BANNER_VALID_BID, DEFAULT_OPTION)[0];
        const pageUrl = extractPayload(requestFirstPartyDataNumber).site.page;

        expect(pageUrl).to.equal(DEFAULT_OPTION.refererInfo.page);
      });

      it('should not set first party or timeout if it is not present', function () {
        config.setConfig({
          ix: {}
        });

        const requestWithoutConfig = spec.buildRequests(DEFAULT_BANNER_VALID_BID, DEFAULT_OPTION)[0];
        const pageUrl = extractPayload(requestWithoutConfig).site.page;

        expect(pageUrl).to.equal(DEFAULT_OPTION.refererInfo.page);
        expect(requestWithoutConfig.data.t).to.be.undefined;
      });

      it('should not set first party or timeout if it is setConfig is not called', function () {
        const requestWithoutConfig = spec.buildRequests(DEFAULT_BANNER_VALID_BID, DEFAULT_OPTION)[0];
        const pageUrl = extractPayload(requestWithoutConfig).site.page;

        expect(pageUrl).to.equal(DEFAULT_OPTION.refererInfo.page);
        expect(requestWithoutConfig.data.t).to.be.undefined;
      });

      it('should no longer set timeout even if publisher set it through setConfig', function () {
        config.setConfig({
          ix: {
            timeout: 500
          }
        });
        const requestWithTimeout = spec.buildRequests(DEFAULT_BANNER_VALID_BID, {})[0];

        expect(requestWithTimeout.data.t).to.be.undefined;
      });

      it('should no longer set timeout even if timeout is a string', function () {
        config.setConfig({
          ix: {
            timeout: '500'
          }
        });
        const requestStringTimeout = spec.buildRequests(DEFAULT_BANNER_VALID_BID, {})[0];

        expect(requestStringTimeout.data.t).to.be.undefined;
      });
    });

    describe('getIxFirstPartyDataPageUrl', () => {
      beforeEach(() => {
        config.setConfig({ ix: { firstPartyData: { key1: 'value1', key2: 'value2' } } });
      });

      afterEach(() => {
        config.resetConfig();
      });

      it('should return the modified URL with first party data query parameters appended', () => {
        const requestWithIXFirstPartyData = spec.buildRequests(DEFAULT_BANNER_VALID_BID, DEFAULT_OPTION)[0];
        const pageUrl = extractPayload(requestWithIXFirstPartyData).site.page;
        expect(pageUrl).to.equal('https://www.prebid.org/?key1=value1&key2=value2');
      });

      it('should return the modified URL with first party data query parameters appended but not duplicated', () => {
        const bidderRequest = deepClone(DEFAULT_OPTION);
        bidderRequest.ortb2.site.page = 'https://www.prebid.org/?key1=value1'
        const requestWithIXFirstPartyData = spec.buildRequests(DEFAULT_BANNER_VALID_BID, DEFAULT_OPTION)[0];
        const pageUrl = extractPayload(requestWithIXFirstPartyData).site.page;
        expect(pageUrl).to.equal('https://www.prebid.org/?key1=value1&key2=value2');
      });

      it('should not overwrite existing query parameters with first party data', () => {
        config.setConfig({ ix: { firstPartyData: { key1: 'value1', key2: 'value2' } } });
        const bidderRequest = deepClone(DEFAULT_OPTION);
        bidderRequest.ortb2.site.page = 'https://www.prebid.org/?key1=existingValue1'
        const requestWithIXFirstPartyData = spec.buildRequests(DEFAULT_BANNER_VALID_BID, bidderRequest)[0];
        const pageUrl = extractPayload(requestWithIXFirstPartyData).site.page;
        expect(pageUrl).to.equal('https://www.prebid.org/?key1=existingValue1&key2=value2');
      });

      it('should return the original URL if no first party data is available', () => {
        config.setConfig({ ix: {} });
        const requestWithIXFirstPartyData = spec.buildRequests(DEFAULT_BANNER_VALID_BID, DEFAULT_OPTION)[0];
        const pageUrl = extractPayload(requestWithIXFirstPartyData).site.page;
        expect(pageUrl).to.equal('https://www.prebid.org');
      });

      it('should return the original URL referer page url if ortb2 does not exist', () => {
        config.setConfig({ ix: {} });
        const bidderRequest = deepClone(DEFAULT_OPTION);
        delete bidderRequest.ortb2;
        bidderRequest.refererInfo.page = 'https://example.com';
        const requestWithIXFirstPartyData = spec.buildRequests(DEFAULT_BANNER_VALID_BID, bidderRequest)[0];
        const pageUrl = extractPayload(requestWithIXFirstPartyData).site.page;
        expect(pageUrl).to.equal('https://example.com');
      });

      it('should use referer URL if the provided ortb2.site.page URL is not valid', () => {
        config.setConfig({ ix: { firstPartyData: { key1: 'value1', key2: 'value2' } } });
        const bidderRequest = deepClone(DEFAULT_OPTION);
        bidderRequest.ortb2.site.page = 'www.invalid-url*&?.com';
        bidderRequest.refererInfo.page = 'https://www.prebid.org';
        const requestWithIXFirstPartyData = spec.buildRequests(DEFAULT_BANNER_VALID_BID, bidderRequest)[0];
        const pageUrl = extractPayload(requestWithIXFirstPartyData).site.page;
        expect(pageUrl).to.equal('https://www.prebid.org/?key1=value1&key2=value2');
      });
    });

    describe('request should contain both banner and video requests', function () {
      let request;
      before(() => {
        request = spec.buildRequests([DEFAULT_BANNER_VALID_BID[0], DEFAULT_VIDEO_VALID_BID[0]], {});
      });

      it('should have banner request', () => {
        const bannerImpression = extractPayload(request[0]).imp[0];
        const sidValue = DEFAULT_BANNER_VALID_BID[0].params.id;

        expect(extractPayload(request[0]).imp).to.have.lengthOf(1);
        expect(bannerImpression.id).to.equal(DEFAULT_BANNER_VALID_BID[0].bidId);

        expect(bannerImpression.banner.format).to.be.length(2);
        expect(bannerImpression.banner.topframe).to.be.oneOf([0, 1]);
        expect(bannerImpression.ext.sid).to.equal(sidValue);

        bannerImpression.banner.format.map(({ w, h, ext }, index) => {
          const size = DEFAULT_BANNER_VALID_BID[0].mediaTypes.banner.sizes[index];

          expect(w).to.equal(size[0]);
          expect(h).to.equal(size[1]);
          expect(ext.siteID).to.equal(DEFAULT_BANNER_VALID_BID[0].params.siteId);
        });
      });

      it('should have video request', () => {
        const videoImpression = extractPayload(request[1]).imp[0];

        expect(videoImpression.id).to.equal(DEFAULT_VIDEO_VALID_BID[0].bidId);
        expect(videoImpression.video.w).to.equal(DEFAULT_VIDEO_VALID_BID[0].params.size[0]);
        expect(videoImpression.video.h).to.equal(DEFAULT_VIDEO_VALID_BID[0].params.size[1]);
      });
    });

    describe('video request should set displaymanager', () => {
      it('ix renderer preferrered', () => {
        const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID);
        bid[0].mediaTypes.video.context = 'outstream';
        bid[0].mediaTypes.video.w = [[300, 143]];
        if (bid[0].ortb2 && bid[0].ortb2.source && bid[0].ortb2.source.ext) {
          delete bid[0].ortb2.source.ext.schain;
        }
        const request = spec.buildRequests(bid);
        const videoImpression = extractPayload(request[0]).imp[0];
        expect(videoImpression.displaymanager).to.equal('ix');
      });
      it('ix renderer not preferrered', () => {
        const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID);
        bid[0].mediaTypes.video.context = 'outstream';
        bid[0].mediaTypes.video.w = [[300, 143]];
        bid[0].mediaTypes.video.renderer = {
          url: 'http://publisherplayer.js',
          render: () => { }
        };
        if (bid[0].ortb2 && bid[0].ortb2.source && bid[0].ortb2.source.ext) {
          delete bid[0].ortb2.source.ext.schain;
        }
        const request = spec.buildRequests(bid);
        const videoImpression = extractPayload(request[0]).imp[0];
        expect(videoImpression.displaymanager).to.equal('http://publisherplayer.js');
      });
      it('ix renderer not preferrered - bad url', () => {
        const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID);
        bid[0].mediaTypes.video.context = 'outstream';
        bid[0].mediaTypes.video.w = [[300, 143]];
        bid[0].mediaTypes.video.renderer = {
          url: 'publisherplayer.js',
          render: () => { }
        };
        if (bid[0].ortb2 && bid[0].ortb2.source && bid[0].ortb2.source.ext) {
          delete bid[0].ortb2.source.ext.schain;
        }
        const request = spec.buildRequests(bid);
        const videoImpression = extractPayload(request[0]).imp[0];
        expect(videoImpression.displaymanager).to.be.undefined;
      });
      it('renderer url provided and is ix renderer', () => {
        const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID);
        bid[0].mediaTypes.video.context = 'outstream';
        bid[0].mediaTypes.video.w = [[300, 143]];
        bid[0].mediaTypes.video.renderer = {
          url: 'http://js-sec.indexww.rendererplayer.com',
          render: () => { }
        };
        if (bid[0].ortb2 && bid[0].ortb2.source && bid[0].ortb2.source.ext) {
          delete bid[0].ortb2.source.ext.schain;
        }
        const request = spec.buildRequests(bid);
        const videoImpression = extractPayload(request[0]).imp[0];
        expect(videoImpression.displaymanager).to.equal('ix');
      });
      it('renderer url undefined and is ix renderer', () => {
        const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID);
        bid[0].mediaTypes.video.context = 'outstream';
        bid[0].mediaTypes.video.w = [[300, 143]];
        bid[0].mediaTypes.video.renderer = {
          render: () => { }
        };
        if (bid[0].ortb2 && bid[0].ortb2.source && bid[0].ortb2.source.ext) {
          delete bid[0].ortb2.source.ext.schain;
        }
        const request = spec.buildRequests(bid);
        const videoImpression = extractPayload(request[0]).imp[0];
        expect(videoImpression.displaymanager).to.be.undefined;
      });
      it('schain', () => {
        const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID);
        bid[0].mediaTypes.video.context = 'outstream';
        bid[0].mediaTypes.video.w = [[300, 143]];
        bid[0].ortb2 = {
          source: {
            ext: {
              schain: SAMPLE_SCHAIN
            }
          }
        };
        const request = spec.buildRequests(bid);
        const videoImpression = extractPayload(request[0]).imp[0];
        expect(videoImpression.displaymanager).to.equal('pbjs_wrapper');
      });
    });

    describe('request should contain both banner and native requests', function () {
      let request;
      before(() => {
        request = spec.buildRequests([DEFAULT_BANNER_VALID_BID[0], DEFAULT_NATIVE_VALID_BID[0]]);
      })

      it('should have banner request', () => {
        const bannerImpression = extractPayload(request[0]).imp[0];
        const sidValue = DEFAULT_BANNER_VALID_BID[0].params.id;

        expect(extractPayload(request[0]).imp).to.have.lengthOf(1);
        expect(bannerImpression.id).to.equal(DEFAULT_BANNER_VALID_BID[0].bidId);

        expect(bannerImpression.banner.format).to.be.length(2);
        expect(bannerImpression.banner.topframe).to.be.oneOf([0, 1]);
        expect(bannerImpression.ext.sid).to.equal(sidValue);

        bannerImpression.banner.format.map(({ w, h, ext }, index) => {
          const size = DEFAULT_BANNER_VALID_BID[0].mediaTypes.banner.sizes[index];

          expect(w).to.equal(size[0]);
          expect(h).to.equal(size[1]);
          expect(ext.siteID).to.equal(DEFAULT_BANNER_VALID_BID[0].params.siteId);
        });
      });

      it('should have native request', () => {
        const nativeImpression = extractPayload(request[1]).imp[0];

        expect(request[1].data.hasOwnProperty('v')).to.equal(false);
        expect(nativeImpression.id).to.equal(DEFAULT_NATIVE_VALID_BID[0].bidId);
        expect(nativeImpression.native).to.deep.equal(DEFAULT_NATIVE_IMP);
      });
    });

    it('single request under 8k size limit for large ad unit', function () {
      const options = {};
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid.mediaTypes.banner.sizes = LARGE_SET_OF_SIZES;
      const requests = spec.buildRequests([bid], options);

      const reqSize = `${requests[0].url}?${utils.parseQueryStringParameters(requests[0].data)}`.length;
      expect(requests).to.be.an('array');
      expect(requests).to.have.lengthOf(1);
      expect(reqSize).to.be.lessThan(8000);
      expect(requests[0].data.sn).to.be.undefined;
    });

    it('1 request, one larger than url size, no splitting', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid.mediaTypes.banner.sizes = LARGE_SET_OF_SIZES;
      bid.params.siteId = '124';
      bid.adUnitCode = 'div-gpt-1'
      bid.transactionId = '152e36d1-1241-4242-t35e-y1dv34d12315';
      bid.bidId = '2f6g5s5e';

      const requests = spec.buildRequests([bid, DEFAULT_BANNER_VALID_BID[0]], DEFAULT_OPTION);
      expect(requests).to.be.an('array');
      expect(requests).to.have.lengthOf(1);
    });

    it('6 ad units should generate only 1 requests', function () {
      const bid1 = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid1.mediaTypes.banner.sizes = LARGE_SET_OF_SIZES;
      bid1.params.siteId = '121';
      bid1.adUnitCode = 'div-gpt-1'
      bid1.transactionId = 'tr1';
      bid1.bidId = '2f6g5s5e';

      const bid2 = utils.deepClone(bid1);
      bid2.transactionId = 'tr2';

      const bid3 = utils.deepClone(bid1);
      bid3.transactionId = 'tr3';

      const bid4 = utils.deepClone(bid1);
      bid4.transactionId = 'tr4';

      const bid5 = utils.deepClone(bid1);
      bid5.transactionId = 'tr5';

      const bid6 = utils.deepClone(bid1);
      bid6.transactionId = 'tr6';

      const requests = spec.buildRequests([bid1, bid2, bid3, bid4, bid5, bid6], DEFAULT_OPTION);

      expect(requests).to.be.an('array');
      expect(requests).to.have.lengthOf(1);

      for (var i = 0; i < requests.length; i++) {
        const reqSize = `${requests[i].url}?${utils.parseQueryStringParameters(requests[i].data)}`.length;
        expect(reqSize).to.be.lessThan(8000);
        const payload = extractPayload(requests[i]);
        expect(payload.source.ext.schain).to.deep.equal(SAMPLE_SCHAIN);
      }
    });

    it('multiple ad units in one request', function () {
      const bid1 = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid1.mediaTypes.banner.sizes = [[300, 250], [300, 600], [100, 200]];
      bid1.params.siteId = '121';
      bid1.adUnitCode = 'div-gpt-1'
      bid1.transactionId = 'tr1';
      bid1.bidId = '2f6g5s5e';

      const bid2 = utils.deepClone(bid1);
      bid2.adUnitCode = 'div-gpt-2'
      bid2.transactionId = 'tr2';
      bid2.mediaTypes.banner.sizes = [[220, 221], [222, 223], [300, 250]];
      const bid3 = utils.deepClone(bid1);
      bid3.adUnitCode = 'div-gpt-3'
      bid3.transactionId = 'tr3';
      bid3.mediaTypes.banner.sizes = [[330, 331], [332, 333], [300, 250]];

      const requests = spec.buildRequests([bid1, bid2, bid3], DEFAULT_OPTION);

      expect(requests).to.be.an('array');
      expect(requests).to.have.lengthOf(1);

      const impressions = extractPayload(requests[0]).imp;
      expect(impressions).to.be.an('array');
      expect(impressions).to.have.lengthOf(3);
      expect(requests[0].data.sn).to.be.undefined;
    });

    it('request should contain the extra banner ad sizes that IX is not configured for using the first site id in the ad unit', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid.sizes.push([336, 280], [970, 90]);
      bid.mediaTypes.banner.sizes.push([336, 280], [970, 90]);
      const bid2 = utils.deepClone(bid);
      bid2.params.siteId = '124';
      bid2.params.size = [300, 600];
      bid2.params.bidId = '2b3c4d5e';

      const request = spec.buildRequests([bid, bid2], DEFAULT_OPTION)[0];
      const impression = extractPayload(request).imp[0];
      const sidValue = bid.params.id;

      expect(impression.id).to.equal(bid.bidId);
      expect(impression.banner.format).to.be.length(bid.mediaTypes.banner.sizes.length);
      expect(impression.banner.topframe).to.be.oneOf([0, 1]);
      expect(impression.ext.sid).to.equal(sidValue);

      impression.banner.format.map(({ w, h, ext }, index) => {
        const size = bid.mediaTypes.banner.sizes[index];

        expect(w).to.equal(size[0]);
        expect(h).to.equal(size[1]);
        expect(ext.siteID).to.equal(index === 1 ? bid2.params.siteId : bid.params.siteId);
      });
    });

    it('request should contain the extra banner ad sizes and their corresponding site ids when there is multiple ad units', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid.params.siteId = '124';
      bid.adUnitCode = 'div-gpt-ad-156456451554-1'
      bid.transactionId = '152e36d1-1241-4242-t35e-y1dv34d12315';
      bid.bidId = '2f6g5s5e';
      bid.params.size = [336, 280]
      bid.sizes = [[336, 280], [970, 90]]
      bid.mediaTypes.banner.sizes = [[336, 280], [970, 90]]

      const bids = [DEFAULT_BANNER_VALID_BID[0], bid];
      const request = spec.buildRequests(bids, DEFAULT_OPTION)[0];

      const impressions = extractPayload(request).imp;
      expect(impressions).to.be.an('array');
      expect(impressions).to.have.lengthOf(2);
      expect(request.data.sn).to.be.undefined;

      impressions.map((impression, impressionIndex) => {
        const firstSizeObject = bids[impressionIndex].mediaTypes.banner.sizes[0];
        const sidValue = bids[impressionIndex].params.id;

        expect(impression.banner.format).to.be.length(2);
        expect(impression.banner.topframe).to.be.oneOf([0, 1]);
        expect(impression.ext.sid).to.equal(sidValue);

        impression.banner.format.map(({ w, h, ext }, index) => {
          const size = bids[impressionIndex].mediaTypes.banner.sizes[index];

          expect(w).to.equal(size[0]);
          expect(h).to.equal(size[1]);
          expect(ext.siteID).to.equal(bids[impressionIndex].params.siteId);
        });
      });
    });

    it('request should not contain the extra video ad sizes that IX is not configured for', function () {
      const request = spec.buildRequests(DEFAULT_VIDEO_VALID_BID, DEFAULT_OPTION);
      const impressions = extractPayload(request[0]).imp;

      expect(impressions).to.be.an('array');
      expect(impressions).to.have.lengthOf(1);
    });

    describe('detect missing sizes', function () {
      it('request should always contain missing sizes', function () {
        const bid1 = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
        bid1.mediaTypes.banner.sizes = LARGE_SET_OF_SIZES;

        const requests = spec.buildRequests([bid1, DEFAULT_BANNER_VALID_BID[0]], DEFAULT_OPTION);

        const impressions = extractPayload(requests[0]).imp;

        expect(impressions).to.be.an('array');
        expect(impressions).to.have.lengthOf(1);
      });
    });
  });

  describe('buildRequestVideo', function () {
    let request, payloadData;
    before(() => {
      request = spec.buildRequests(DEFAULT_VIDEO_VALID_BID, DEFAULT_OPTION);
      payloadData = request[0].data;
    })

    it('auction type should be set correctly', function () {
      const at = payloadData.at;
      expect(at).to.equal(1);
    })

    it('impression should have correct format and value', function () {
      const impression = payloadData.imp[0];

      expect(impression.id).to.equal(DEFAULT_VIDEO_VALID_BID[0].bidId);
      expect(impression.video.w).to.equal(DEFAULT_VIDEO_VALID_BID[0].params.size[0]);
      expect(impression.video.h).to.equal(DEFAULT_VIDEO_VALID_BID[0].params.size[1]);
      expect(impression.video.placement).to.equal(1);
      expect(impression.video.minduration).to.exist;
      expect(impression.video.minduration).to.equal(0);
      expect(impression.video.mimes[0]).to.equal('video/mp4');
      expect(impression.video.mimes[1]).to.equal('video/webm');

      expect(impression.video.skippable).to.equal(false);
    });

    it('should not use default placement values when placement is defined at adUnit level', function () {
      const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID[0]);
      bid.mediaTypes.video.context = 'outstream';
      bid.mediaTypes.video.placement = 2;
      const request = spec.buildRequests([bid], {})[0];
      const impression = extractPayload(request).imp[0];

      expect(impression.id).to.equal(DEFAULT_VIDEO_VALID_BID[0].bidId);
      expect(impression.video.placement).to.equal(2);
    });

    it('should use plcmt value when set in video.params', function () {
      const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID[0]);
      bid.params.video.plcmt = 2;
      const request = spec.buildRequests([bid], {})[0];
      const impression = extractPayload(request).imp[0];

      expect(impression.id).to.equal(DEFAULT_VIDEO_VALID_BID[0].bidId);
      expect(impression.video.plcmt).to.equal(2);
    });

    it('invalid plcmt value when set in video.params', function () {
      const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID[0]);
      bid.params.video.plcmt = 5;
      const request = spec.buildRequests([bid], {})[0];
      const impression = extractPayload(request).imp[0];

      expect(impression.id).to.equal(DEFAULT_VIDEO_VALID_BID[0].bidId);
      expect(impression.video.plcmt).to.be.undefined;
    });

    it('invalid plcmt value string when set in video.params', function () {
      const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID[0]);
      bid.params.video.plcmt = '4';
      const request = spec.buildRequests([bid], {})[0];
      const impression = extractPayload(request).imp[0];

      expect(impression.id).to.equal(DEFAULT_VIDEO_VALID_BID[0].bidId);
      expect(impression.video.plcmt).to.be.undefined;
    });

    it('should set imp.ext.sid for video imps if params.id exists', function () {
      const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID[0]);
      bid.params.id = 50;
      const request = spec.buildRequests([bid], {})[0];
      const impression = extractPayload(request).imp[0];

      expect(impression.ext.sid).to.equal('50');
    });

    it('should set correct default placement, if context is instream', function () {
      const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID[0]);
      bid.mediaTypes.video.context = 'instream';
      const request = spec.buildRequests([bid], {})[0];
      const impression = extractPayload(request).imp[0];

      expect(impression.id).to.equal(DEFAULT_VIDEO_VALID_BID[0].bidId);
      expect(impression.video.placement).to.equal(1);
    });

    it('should set correct default placement, if context is outstream', function () {
      const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID[0]);
      bid.mediaTypes.video.context = 'outstream';
      const request = spec.buildRequests([bid], {})[0];
      const impression = extractPayload(request).imp[0];

      expect(impression.id).to.equal(DEFAULT_VIDEO_VALID_BID[0].bidId);
      expect(impression.video.placement).to.equal(3);
      expect(extractPayload(request).ext.ixdiag.vpd).to.equal(true);
    });

    it('should handle unexpected context', function () {
      const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID[0]);
      bid.mediaTypes.video.context = 'not-valid';
      const request = spec.buildRequests([bid], {})[0];
      const impression = extractPayload(request).imp[0];
      expect(impression.video.placement).to.be.undefined;
    });

    it('should not override video properties if they are already configured at the params video level', function () {
      const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID[0]);
      bid.mediaTypes.video.context = 'outstream';
      bid.mediaTypes.video.protocols = [1];
      bid.mediaTypes.video.mimes = ['video/override'];
      const request = spec.buildRequests([bid], {})[0];
      const impression = extractPayload(request).imp[0];

      expect(impression.video.protocols[0]).to.equal(2);
      expect(impression.video.mimes[0]).to.not.equal('video/override');
    });

    it('should not add video adunit level properties in imp object if they are not allowlisted', function () {
      const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID[0]);
      bid.mediaTypes.video.context = 'outstream';
      bid.mediaTypes.video.random = true;
      const request = spec.buildRequests([bid], {})[0];
      const impression = extractPayload(request).imp[0];

      expect(impression.video.random).to.not.exist;
    });

    it('should add allowlisted adunit level video properties in imp object if they are not configured at params level', function () {
      const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID[0]);
      bid.mediaTypes.video.context = 'outstream';
      delete bid.params.video.protocols;
      delete bid.params.video.mimes;
      bid.mediaTypes.video.protocols = [6];
      bid.mediaTypes.video.mimes = ['video/mp4'];
      bid.mediaTypes.video.api = 2;
      bid.mediaTypes.video.pos = 0;
      const request = spec.buildRequests([bid], {})[0];
      const impression = extractPayload(request).imp[0];

      expect(impression.video.protocols[0]).to.equal(6);
      expect(impression.video.api).to.equal(2);
      expect(impression.video.pos).to.equal(0);
      expect(impression.video.mimes[0]).to.equal('video/mp4');
    });

    it('should send gpid in request if ortb2Imp.ext.gpid exists', function () {
      const GPID = '/19968336/some-adunit-path';
      const validBids = utils.deepClone(DEFAULT_VIDEO_VALID_BID);
      validBids[0].ortb2Imp = {
        ext: {
          gpid: GPID
        }
      };
      const requests = spec.buildRequests(validBids, DEFAULT_OPTION);
      const { ext: { gpid } } = extractPayload(requests[0]).imp[0];
      expect(gpid).to.equal(GPID);
    });

    it('should build video request when if video obj is not provided at params level', () => {
      const request = spec.buildRequests([DEFAULT_VIDEO_VALID_BID_NO_VIDEO_PARAMS[0]], {});
      const videoImpression = extractPayload(request[0]).imp[0];

      expect(videoImpression.id).to.equal(DEFAULT_VIDEO_VALID_BID_NO_VIDEO_PARAMS[0].bidId);
      expect(videoImpression.video.w).to.equal(DEFAULT_VIDEO_VALID_BID_NO_VIDEO_PARAMS[0].mediaTypes.video.playerSize[0][0]);
      expect(videoImpression.video.h).to.equal(DEFAULT_VIDEO_VALID_BID_NO_VIDEO_PARAMS[0].mediaTypes.video.playerSize[0][1]);
    });

    it('should set different placement for floating ad units', () => {
      const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID[0]);
      bid.mediaTypes.video.context = 'outstream';
      bid.params.video.playerConfig = {
        floatOnScroll: true
      };

      const request = spec.buildRequests([bid]);
      const videoImpression = extractPayload(request[0]).imp[0];

      expect(videoImpression.video.placement).to.eq(5);
    })
  });

  describe('buildRequestNative', function () {
    it('should build request with expected params', function () {
      const request = spec.buildRequests(DEFAULT_NATIVE_VALID_BID, DEFAULT_OPTION)[0];

      expect(request.data).to.exist;
      expect(request.method).to.equal('POST')
    });

    it('should send gpid in request if ortb2Imp.ext.gpid exists', function () {
      const GPID = '/19968336/some-adunit-path';
      const bids = utils.deepClone(DEFAULT_NATIVE_VALID_BID);
      bids[0].ortb2Imp = {
        ext: {
          gpid: GPID
        }
      };
      const requests = spec.buildRequests(bids, DEFAULT_OPTION);
      const { ext: { gpid } } = extractPayload(requests[0]).imp[0];
      expect(gpid).to.equal(GPID);
    });

    it('should build request with required asset properties with default values', function () {
      const request = spec.buildRequests(DEFAULT_NATIVE_VALID_BID, DEFAULT_OPTION);
      const nativeImpression = extractPayload(request[0]).imp[0];

      expect(request[0].data.hasOwnProperty('v')).to.equal(false);
      expect(nativeImpression.id).to.equal(DEFAULT_NATIVE_VALID_BID[0].bidId);
      expect(nativeImpression.native).to.deep.equal(DEFAULT_NATIVE_IMP);
    });

    it('should set imp.ext.sid for native imps if params.id exist', function () {
      const bid = utils.deepClone(DEFAULT_NATIVE_VALID_BID);
      bid[0].params.id = 'abc'
      const request = spec.buildRequests(bid, DEFAULT_OPTION);
      const nativeImpression = extractPayload(request[0]).imp[0];

      expect(nativeImpression.id).to.equal(DEFAULT_NATIVE_VALID_BID[0].bidId);
      expect(nativeImpression.ext.sid).to.equal('abc');
    });

    it('should build request with given asset properties', function () {
      const bid = utils.deepClone(DEFAULT_NATIVE_VALID_BID)
      bid[0].nativeOrtbRequest = {
        assets: [{ id: 0, required: 0, title: { len: 140 } }, { id: 1, required: 0, video: { mimes: ['javascript'], minduration: 10, maxduration: 60, protocols: [1] } }]
      }
      const request = spec.buildRequests(bid, DEFAULT_OPTION);
      const nativeImpression = extractPayload(request[0]).imp[0];
      expect(nativeImpression.native).to.deep.equal({ request: '{"assets":[{"id":0,"required":0,"title":{"len":140}},{"id":1,"required":0,"video":{"mimes":["javascript"],"minduration":10,"maxduration":60,"protocols":[1]}}],"eventtrackers":[{"event":1,"methods":[1,2]}],"privacy":1}', ver: '1.2' });
    });

    it('should build request with all possible Prebid asset properties', function () {
      const bid = utils.deepClone(DEFAULT_NATIVE_VALID_BID)
      bid[0].nativeOrtbRequest = {
        'ver': '1.2',
        'assets': [
          {
            'id': 0,
            'required': 0,
            'title': {
              'len': 140
            }
          },
          {
            'id': 1,
            'required': 0,
            'data': {
              'type': 2
            }
          },
          {
            'id': 2,
            'required': 0,
            'data': {
              'type': 10
            }
          },
          {
            'id': 3,
            'required': 0,
            'data': {
              'type': 1
            }
          },
          {
            'id': 4,
            'required': 0,
            'img': {
              'type': 1
            }
          },
          {
            'id': 5,
            'required': 0,
            'img': {
              'type': 3
            }
          },
          {
            'id': 6,
            'required': 0
          },
          {
            'id': 7,
            'required': 0,
            'data': {
              'type': 11
            }
          },
          {
            'id': 8,
            'required': 0
          },
          {
            'id': 9,
            'required': 0
          },
          {
            'id': 10,
            'required': 0,
            'data': {
              'type': 12
            }
          },
          {
            'id': 11,
            'required': 0,
            'data': {
              'type': 3
            }
          },
          {
            'id': 12,
            'required': 0,
            'data': {
              'type': 5
            }
          },
          {
            'id': 13,
            'required': 0,
            'data': {
              'type': 4
            }
          },
          {
            'id': 14,
            'required': 0,
            'data': {
              'type': 6
            }
          },
          {
            'id': 15,
            'required': 0,
            'data': {
              'type': 7
            }
          },
          {
            'id': 16,
            'required': 0,
            'data': {
              'type': 9
            }
          },
          {
            'id': 17,
            'required': 0,
            'data': {
              'type': 8
            }
          }
        ]
      }
      const request = spec.buildRequests(bid, DEFAULT_OPTION);
      const nativeImpression = extractPayload(request[0]).imp[0];
      expect(nativeImpression.native).to.deep.equal({ request: '{"ver":"1.2","assets":[{"id":0,"required":0,"title":{"len":140}},{"id":1,"required":0,"data":{"type":2}},{"id":2,"required":0,"data":{"type":10}},{"id":3,"required":0,"data":{"type":1}},{"id":4,"required":0,"img":{"type":1}},{"id":5,"required":0,"img":{"type":3}},{"id":6,"required":0},{"id":7,"required":0,"data":{"type":11}},{"id":8,"required":0},{"id":9,"required":0},{"id":10,"required":0,"data":{"type":12}},{"id":11,"required":0,"data":{"type":3}},{"id":12,"required":0,"data":{"type":5}},{"id":13,"required":0,"data":{"type":4}},{"id":14,"required":0,"data":{"type":6}},{"id":15,"required":0,"data":{"type":7}},{"id":16,"required":0,"data":{"type":9}},{"id":17,"required":0,"data":{"type":8}}],"eventtrackers":[{"event":1,"methods":[1,2]}],"privacy":1}', ver: '1.2' });
    })
  });

  describe('buildRequestMultiFormat', function () {
    it('only banner bidder params set', function () {
      const request = spec.buildRequests(DEFAULT_MULTIFORMAT_BANNER_VALID_BID, {})
      const bannerImpression = extractPayload(request[0]).imp[0];
      expect(extractPayload(request[0]).imp).to.have.lengthOf(1);
      expect(bannerImpression.id).to.equal(DEFAULT_MULTIFORMAT_BANNER_VALID_BID[0].bidId);
      expect(bannerImpression.banner.format[0].w).to.equal(DEFAULT_MULTIFORMAT_BANNER_VALID_BID[0].params.size[0]);
      expect(bannerImpression.banner.format[0].h).to.equal(DEFAULT_MULTIFORMAT_BANNER_VALID_BID[0].params.size[1]);
    });

    describe('only video bidder params set', function () {
      it('should generate video impression', function () {
        const request = spec.buildRequests(DEFAULT_MULTIFORMAT_VIDEO_VALID_BID, {});
        const videoImp = extractPayload(request[1]).imp[0];
        expect(extractPayload(request[1]).imp).to.have.lengthOf(1);
        expect(videoImp.id).to.equal(DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0].bidId);
        expect(videoImp.video.w).to.equal(DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0].params.size[0]);
        expect(videoImp.video.h).to.equal(DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0].params.size[1]);
      });
    });

    describe('both banner and video bidder params set', function () {
      const bids = [DEFAULT_MULTIFORMAT_BANNER_VALID_BID[0], DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0]];
      let request;
      before(() => {
        request = spec.buildRequests(bids, {});
      })

      it('should return valid banner requests', function () {
        const impressions = extractPayload(request[0]).imp;

        expect(impressions).to.have.lengthOf(2);

        impressions.map((impression, index) => {
          const bid = bids[index];

          expect(impression.id).to.equal(bid.bidId);
          expect(impression.banner.format).to.be.length(bid.mediaTypes.banner.sizes.length);
          expect(impression.banner.topframe).to.be.oneOf([0, 1]);

          impression.banner.format.map(({ w, h, ext }, index) => {
            const size = bid.mediaTypes.banner.sizes[index];

            expect(w).to.equal(size[0]);
            expect(h).to.equal(size[1]);
            expect(ext.siteID).to.equal(bid.params.siteId);
          });
        });
      });

      it('should return valid banner and video requests', function () {
        const videoImpression = extractPayload(request[1]).imp[0];

        expect(extractPayload(request[1]).imp).to.have.lengthOf(1);
        expect(videoImpression.id).to.equal(DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0].bidId);
        expect(videoImpression.video.w).to.equal(DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0].mediaTypes.video.playerSize[0][0]);
        expect(videoImpression.video.h).to.equal(DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0].mediaTypes.video.playerSize[0][1]);
      });

      it('should contain all correct IXdiag properties', function () {
        const diagObj = extractPayload(request[0]).ext.ixdiag;
        expect(diagObj.iu).to.equal(0);
        expect(diagObj.nu).to.equal(0);
        expect(diagObj.ou).to.equal(2);
        expect(diagObj.ren).to.equal(true);
        expect(diagObj.mfu).to.equal(2);
        expect(diagObj.allu).to.equal(2);
        expect(diagObj.version).to.equal('$prebid.version$');
        expect(diagObj.url).to.equal('http://localhost:9876/context.html')
        expect(diagObj.tagid).to.equal(DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0].params.tagId)
        expect(diagObj.adunitcode).to.equal(DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0].adUnitCode)
      });
    });

    describe('siteId overrides', function () {
      it('should use siteId override', function () {
        const validBids = DEFAULT_MULTIFORMAT_VALID_BID;
        const request = spec.buildRequests(validBids, {});
        const bannerImps = request[0].data.imp[0];
        const videoImps = request[1].data.imp[0];
        const nativeImps = request[2].data.imp[0];
        expect(videoImps.ext.siteID).to.equal('1111');
        bannerImps.banner.format.map(({ ext }) => {
          expect(ext.siteID).to.equal('2222');
        });
        expect(nativeImps.ext.siteID).to.equal('3333');
      });

      it('should use default siteId if overrides are not provided', function () {
        const validBids = DEFAULT_MULTIFORMAT_VALID_BID;
        delete validBids[0].params.banner;
        delete validBids[0].params.video;
        delete validBids[0].params.native;
        const request = spec.buildRequests(validBids, {});
        const bannerImps = request[0].data.imp[0];
        const videoImps = request[1].data.imp[0];
        const nativeImps = request[2].data.imp[0];
        expect(videoImps.ext.siteID).to.equal('456');
        bannerImps.banner.format.map(({ ext }) => {
          expect(ext.siteID).to.equal('456');
        });
        expect(nativeImps.ext.siteID).to.equal('456');
      });
    });
  });

  describe('buildRequestFledge', function () {
    it('impression should have ae=1 in ext when fledge module is enabled and ae is set in ad unit', function () {
      const bidderRequest = deepClone(DEFAULT_OPTION_FLEDGE_ENABLED);
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID_WITH_FLEDGE_ENABLED[0]);
      const requestBidFloor = spec.buildRequests([bid], bidderRequest)[0];
      const impression = extractPayload(requestBidFloor).imp[0];

      expect(impression.ext.ae).to.equal(1);
    });

    it('impression should have ae=1 in ext when request has paapi.enabled = true and ext.ae = 1', function () {
      const bidderRequest = deepClone(DEFAULT_OPTION_FLEDGE_ENABLED);
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID_WITH_FLEDGE_ENABLED[0]);
      const requestBidFloor = spec.buildRequests([bid], bidderRequest)[0];
      const impression = extractPayload(requestBidFloor).imp[0];

      expect(impression.ext.ae).to.equal(1);
    });

    it('impression should not have ae=1 in ext when fledge module is enabled globally through setConfig but overidden at ad unit level', function () {
      const bidderRequest = deepClone(DEFAULT_OPTION_FLEDGE_ENABLED);
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      const requestBidFloor = spec.buildRequests([bid], bidderRequest)[0];
      const impression = extractPayload(requestBidFloor).imp[0];

      expect(impression.ext.ae).to.be.undefined;
    });

    it('impression should not have ae=1 in ext when fledge module is disabled', function () {
      const bidderRequest = deepClone(DEFAULT_OPTION);
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      const requestBidFloor = spec.buildRequests([bid], bidderRequest)[0];
      const impression = extractPayload(requestBidFloor).imp[0];

      expect(impression.ext.ae).to.be.undefined;
    });

    it('should contain correct IXdiag ae property for Fledge', function () {
      const bid = DEFAULT_BANNER_VALID_BID_WITH_FLEDGE_ENABLED[0];
      const bidderRequestWithFledgeEnabled = deepClone(DEFAULT_OPTION_FLEDGE_ENABLED);
      const request = spec.buildRequests([bid], bidderRequestWithFledgeEnabled);
      const diagObj = extractPayload(request[0]).ext.ixdiag;
      expect(diagObj.ae).to.equal(true);
    });

    it('should log warning for non integer auction environment in ad unit for fledge', () => {
      const logWarnSpy = sinon.spy(utils, 'logWarn');
      const bid = DEFAULT_BANNER_VALID_BID_WITH_FLEDGE_ENABLED[0];
      bid.ortb2Imp.ext.ae = 'malformed'
      const bidderRequestWithFledgeEnabled = deepClone(DEFAULT_OPTION_FLEDGE_ENABLED);
      spec.buildRequests([bid], bidderRequestWithFledgeEnabled);
      expect(logWarnSpy.calledWith('error setting auction environment flag - must be an integer')).to.be.true;
      logWarnSpy.restore();
    });

    it('impression should have paapi extension when passed', function () {
      const bidderRequest = deepClone(DEFAULT_OPTION_FLEDGE_ENABLED);
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID_WITH_FLEDGE_ENABLED[0]);
      bid.ortb2Imp.ext.ae = 1
      bid.ortb2Imp.ext.paapi = {
        requestedSize: {
          width: 300,
          height: 250
        }
      }
      const requestBidFloor = spec.buildRequests([bid], bidderRequest)[0];
      const impression = extractPayload(requestBidFloor).imp[0];
      expect(impression.ext.paapi.requestedSize.width).to.equal(300);
      expect(impression.ext.paapi.requestedSize.height).to.equal(250);
    });
  });

  describe('integration through exchangeId and externalId', function () {
    const expectedExchangeId = 123456;
    // create banner bids with externalId but no siteId as bidder param
    const bannerBids = utils.deepClone(DEFAULT_BANNER_VALID_BID);
    delete bannerBids[0].params.siteId;
    bannerBids[0].params.externalId = 'exteranl_id_1';

    beforeEach(() => {
      config.setConfig({ exchangeId: expectedExchangeId });
      spec.resetSiteID();
    });

    afterEach(() => {
      config.resetConfig();
    });

    it('when exchangeId and externalId set but no siteId, isBidRequestValid should return true', function () {
      const bid = utils.deepClone(bannerBids[0]);
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('when neither exchangeId nor siteId set, isBidRequestValid should return false', function () {
      config.resetConfig();
      const bid = utils.deepClone(bannerBids[0]);
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('when exchangeId and externalId set with banner impression but no siteId, bidrequest sent to endpoint with p param and externalID inside imp.ext', function () {
      const requests = spec.buildRequests(bannerBids, DEFAULT_OPTION);
      const payload = extractPayload(requests[0]);

      const expectedURL = IX_SECURE_ENDPOINT + '?p=' + expectedExchangeId;
      expect(requests[0].url).to.equal(expectedURL);
      expect(payload.imp[0].ext.externalID).to.equal(bannerBids[0].params.externalId);
      expect(payload.imp[0].banner.format[0].ext).to.be.undefined;
      expect(payload.imp[0].ext.siteID).to.be.undefined;
    });

    it('when exchangeId and externalId set with video impression, bidrequest sent to endpoint with p param and externalID inside imp.ext', function () {
      const validBids = utils.deepClone(DEFAULT_VIDEO_VALID_BID);
      delete validBids[0].params.siteId;
      validBids[0].params.externalId = 'exteranl_id_1';

      const requests = spec.buildRequests(validBids, DEFAULT_OPTION);
      const payload = extractPayload(requests[0]);

      const expectedURL = IX_SECURE_ENDPOINT + '?p=' + expectedExchangeId;
      expect(requests[0].url).to.equal(expectedURL);
      expect(payload.imp[0].ext.externalID).to.equal(validBids[0].params.externalId);
      expect(payload.imp[0].ext.siteID).to.be.undefined;
    });

    it('when exchangeId and externalId set beside siteId, bidrequest sent to endpoint with both p param and s param and externalID inside imp.ext and siteID inside imp.banner.format.ext', function () {
      bannerBids[0].params.siteId = '1234';
      const requests = spec.buildRequests(bannerBids, DEFAULT_OPTION);
      const payload = extractPayload(requests[0]);

      const expectedURL = IX_SECURE_ENDPOINT + '?s=' + bannerBids[0].params.siteId + '&p=' + expectedExchangeId;
      expect(requests[0].url).to.equal(expectedURL);
      expect(payload.imp[0].ext.externalID).to.equal(bannerBids[0].params.externalId);
      expect(payload.imp[0].banner.format[0].ext.externalID).to.be.undefined;
      expect(payload.imp[0].ext.siteID).to.be.undefined;
      expect(payload.imp[0].banner.format[0].ext.siteID).to.equal(bannerBids[0].params.siteId);
    });

    it('when exchangeId and siteId set, but no externalId, bidrequest sent to exchange', function () {
      bannerBids[0].params.siteId = '1234';
      delete bannerBids[0].params.externalId;
      const requests = spec.buildRequests(bannerBids, DEFAULT_OPTION);
      const payload = extractPayload(requests[0]);

      const expectedURL = IX_SECURE_ENDPOINT + '?s=' + bannerBids[0].params.siteId + '&p=' + expectedExchangeId;
      expect(requests[0].url).to.equal(expectedURL);
      expect(payload.imp[0].ext.externalID).to.be.undefined;
      expect(payload.imp[0].banner.format[0].ext.siteID).to.equal(bannerBids[0].params.siteId);
    });
  });

  describe('interpretResponse', function () {
    // generate bidderRequest with real buildRequest logic for intepretResponse testing
    let bannerBidderRequest
    let videoBidderRequest
    let nativeBidderRequest

    beforeEach(() => {
      bannerBidderRequest = spec.buildRequests(DEFAULT_BANNER_VALID_BID, {})[0]
      videoBidderRequest = spec.buildRequests(DEFAULT_VIDEO_VALID_BID_MEDIUM_SIZE, {})[0]
      nativeBidderRequest = spec.buildRequests(DEFAULT_NATIVE_VALID_BID, {})[0]
    });

    it('should get correct bid response for banner ad', function () {
      const expectedParse = [
        {
          requestId: '1a2b3c4d',
          cpm: 1,
          creativeId: '12345',
          width: 300,
          height: 250,
          mediaType: 'banner',
          ad: '<a target="_blank" href="https://www.indexexchange.com"></a>',
          currency: 'USD',
          ttl: 300,
          netRevenue: true,
          meta: {
            networkId: 50,
            brandId: 303325,
            brandName: 'OECTA',
            advertiserDomains: ['www.abc.com']
          },
          ext: {
            ibv: true
          }
        }
      ];
      const result = spec.interpretResponse({ body: DEFAULT_BANNER_BID_RESPONSE }, bannerBidderRequest);
      expect(result[0]).to.deep.equal(expectedParse[0]);
    });

    it('should get correct bid response for banner ad with dsa signals', function () {
      const expectedParse = [
        {
          requestId: '1a2b3c4d',
          cpm: 1,
          creativeId: '12345',
          width: 300,
          height: 250,
          mediaType: 'banner',
          ad: '<a target="_blank" href="https://www.indexexchange.com"></a>',
          currency: 'USD',
          ttl: 300,
          netRevenue: true,
          meta: {
            networkId: 50,
            brandId: 303325,
            brandName: 'OECTA',
            advertiserDomains: ['www.abc.com'],
            dsa: {
              behalf: 'Advertiser',
              paid: 'Advertiser',
              transparency: [{
                domain: 'dsp1domain.com',
                dsaparams: [1, 2]
              }],
              'adrender': 1
            }
          }
        }
      ];
      const result = spec.interpretResponse({ body: DEFAULT_BANNER_BID_RESPONSE_WITH_DSA }, bannerBidderRequest);
      expect(result[0]).to.deep.equal(expectedParse[0]);
    });

    it('should get correct bid response for banner ad with missing adomain', function () {
      const expectedParse = [
        {
          requestId: '1a2b3c4d',
          cpm: 1,
          creativeId: '12345',
          width: 300,
          height: 250,
          mediaType: 'banner',
          ad: '<a target="_blank" href="https://www.indexexchange.com"></a>',
          currency: 'USD',
          ttl: 300,
          netRevenue: true,
          meta: {
            networkId: 50,
            brandId: 303325,
            brandName: 'OECTA'
          }
        }
      ];
      const result = spec.interpretResponse({ body: DEFAULT_BANNER_BID_RESPONSE_WITHOUT_ADOMAIN }, bannerBidderRequest);
      expect(result[0]).to.deep.equal(expectedParse[0]);
    });

    it('should set creativeId to default value if not provided', function () {
      const bidResponse = utils.deepClone(DEFAULT_BANNER_BID_RESPONSE);
      delete bidResponse.seatbid[0].bid[0].crid;
      const expectedParse = [
        {
          requestId: '1a2b3c4d',
          cpm: 1,
          creativeId: '-',
          width: 300,
          height: 250,
          mediaType: 'banner',
          ad: '<a target="_blank" href="https://www.indexexchange.com"></a>',
          currency: 'USD',
          ttl: 300,
          netRevenue: true,
          meta: {
            networkId: 50,
            brandId: 303325,
            brandName: 'OECTA',
            advertiserDomains: ['www.abc.com']
          }
        }
      ];
      const result = spec.interpretResponse({ body: bidResponse }, bannerBidderRequest);
    });

    it('should set Japanese price correctly', function () {
      const bidResponse = utils.deepClone(DEFAULT_BANNER_BID_RESPONSE);
      bidResponse.cur = 'JPY';
      const expectedParse = [
        {
          requestId: '1a2b3c4d',
          cpm: 100,
          creativeId: '12345',
          width: 300,
          height: 250,
          mediaType: 'banner',
          ad: '<a target="_blank" href="https://www.indexexchange.com"></a>',
          currency: 'JPY',
          ttl: 300,
          netRevenue: true,
          meta: {
            networkId: 50,
            brandId: 303325,
            brandName: 'OECTA',
            advertiserDomains: ['www.abc.com']
          },
          ext: {
            ibv: true
          }
        }
      ];
      const result = spec.interpretResponse({ body: bidResponse }, bannerBidderRequest);
      expect(result[0]).to.deep.equal(expectedParse[0]);
    });

    it('should prioritize bid[].dealid over bid[].ext.dealid ', function () {
      const bidResponse = utils.deepClone(DEFAULT_BANNER_BID_RESPONSE);
      bidResponse.seatbid[0].bid[0].ext.dealid = 'ext-deal';
      bidResponse.seatbid[0].bid[0].dealid = 'outter-deal';
      const expectedParse = [
        {
          requestId: '1a2b3c4d',
          cpm: 1,
          creativeId: '12345',
          width: 300,
          height: 250,
          mediaType: 'banner',
          ad: '<a target="_blank" href="https://www.indexexchange.com"></a>',
          currency: 'USD',
          ttl: 300,
          netRevenue: true,
          dealId: 'outter-deal',
          meta: {
            networkId: 50,
            brandId: 303325,
            brandName: 'OECTA',
            advertiserDomains: ['www.abc.com']
          }
        }
      ];
      const result = spec.interpretResponse({ body: bidResponse }, bannerBidderRequest);

      expect(result[0].dealId).to.equal(expectedParse[0].dealId);
    });

    it('should not set bid[].dealid if dealid is not present', function () {
      const bidResponse = utils.deepClone(DEFAULT_BANNER_BID_RESPONSE);
      const expectedParse = [
        {
          requestId: '1a2b3c4d',
          cpm: 1,
          creativeId: '12345',
          width: 300,
          height: 250,
          mediaType: 'banner',
          ad: '<a target="_blank" href="https://www.indexexchange.com"></a>',
          currency: 'USD',
          ttl: 300,
          netRevenue: true,
          meta: {
            networkId: 50,
            brandId: 303325,
            brandName: 'OECTA',
            advertiserDomains: ['www.abc.com']
          },
          ext: {
            ibv: true
          }
        }
      ];
      const result = spec.interpretResponse({ body: bidResponse }, bannerBidderRequest);
      expect(result[0]).to.deep.equal(expectedParse[0]);
    });

    it('should use set bid[].ext.dealid if bid[].dealid is not present', function () {
      const bidResponse = utils.deepClone(DEFAULT_BANNER_BID_RESPONSE);
      bidResponse.seatbid[0].bid[0].ext.dealid = 'ext-deal';
      const expectedParse = [
        {
          requestId: '1a2b3c4d',
          cpm: 1,
          creativeId: '12345',
          width: 300,
          height: 250,
          mediaType: 'banner',
          ad: '<a target="_blank" href="https://www.indexexchange.com"></a>',
          currency: 'USD',
          ttl: 300,
          dealId: 'ext-deal',
          netRevenue: true,
          meta: {
            networkId: 50,
            brandId: 303325,
            brandName: 'OECTA',
            advertiserDomains: ['www.abc.com']
          }
        }
      ];
      const result = spec.interpretResponse({ body: bidResponse }, bannerBidderRequest);
      expect(result[0].dealId).to.deep.equal(expectedParse[0].dealId);
    });

    it('should get correct bid response for video ad', function () {
      const expectedParse = [
        {
          requestId: '1a2b3c4e',
          cpm: 1.1,
          creativeId: '12346',
          mediaType: 'video',
          mediaTypes: {
            video: {
              context: 'instream',
              playerSize: [
                [
                  400,
                  100
                ]
              ]
            }
          },
          width: 640,
          height: 480,
          currency: 'USD',
          ttl: 3600,
          netRevenue: true,
          vastUrl: 'www.abcd.com/vast',
          meta: {
            networkId: 51,
            brandId: 303326,
            brandName: 'OECTB',
            advertiserDomains: ['www.abcd.com']
          }
        }
      ];
      const result = spec.interpretResponse({ body: DEFAULT_VIDEO_BID_RESPONSE }, {
        data: videoBidderRequest.data, validBidRequests: ONE_VIDEO
      });

      expect(result[0]).to.deep.equal(expectedParse[0]);
    });

    it('should set bid[].renderer if renderer not defined at mediaType.video level', function () {
      const bid = spec.interpretResponse({ body: DEFAULT_VIDEO_BID_RESPONSE }, {
        data: videoBidderRequest.data, validBidRequests: DEFAULT_MULTIFORMAT_BANNER_VALID_BID
      });
      expect(bid[0].renderer).to.exist;
    });

    it('should set renderer URL by parsing video response', function () {
      const bid = spec.interpretResponse({ body: DEFAULT_VIDEO_BID_RESPONSE }, {
        data: videoBidderRequest.data, validBidRequests: DEFAULT_MULTIFORMAT_BANNER_VALID_BID
      });
      expect(bid[0].renderer.url).to.equal(DEFAULT_VIDEO_BID_RESPONSE.ext.videoplayerurl);
    });

    it('should not set bid[].renderer if renderer defined at mediaType.video level', function () {
      const outstreamAdUnit = utils.deepClone(DEFAULT_MULTIFORMAT_BANNER_VALID_BID);
      outstreamAdUnit[0].mediaTypes.video.renderer = {
        url: 'test',
        render: function () { }
      };
      const bid = spec.interpretResponse({ body: DEFAULT_VIDEO_BID_RESPONSE }, {
        data: videoBidderRequest.data, validBidRequests: outstreamAdUnit
      });
      expect(bid[0].renderer).to.be.undefined;
    });

    it('should not set bid[].renderer if renderer defined at the ad unit level', function () {
      const outstreamAdUnit = utils.deepClone(DEFAULT_MULTIFORMAT_BANNER_VALID_BID);
      outstreamAdUnit[0].renderer = {
        url: 'test',
        render: function () { }
      };
      const bid = spec.interpretResponse({ body: DEFAULT_VIDEO_BID_RESPONSE }, {
        data: videoBidderRequest.data, validBidRequests: outstreamAdUnit
      });
      expect(bid[0].renderer).to.be.undefined;
    });

    it('should set bid[].renderer if ad unit renderer is invalid', function () {
      const outstreamAdUnit = utils.deepClone(DEFAULT_MULTIFORMAT_BANNER_VALID_BID);
      outstreamAdUnit[0].mediaTypes.video.renderer = {
        url: 'test'
      };
      const bid = spec.interpretResponse({ body: DEFAULT_VIDEO_BID_RESPONSE }, {
        data: videoBidderRequest.data, validBidRequests: outstreamAdUnit
      });
      expect(bid[0].renderer).to.exist;
    });

    it('should set bid[].renderer if ad unit renderer is a backup', function () {
      const outstreamAdUnit = utils.deepClone(DEFAULT_MULTIFORMAT_BANNER_VALID_BID);
      outstreamAdUnit[0].mediaTypes.video.renderer = {
        url: 'test',
        render: function () { },
        backupOnly: true
      };
      const bid = spec.interpretResponse({ body: DEFAULT_VIDEO_BID_RESPONSE }, {
        data: videoBidderRequest.data, validBidRequests: outstreamAdUnit
      });
      expect(bid[0].renderer).to.exist;
    });

    it('should get correct bid response for video ad and set bid.vastXml when mtype is 2 (video)', function () {
      const expectedParse = [
        {
          requestId: '1a2b3c4e',
          cpm: 1.1,
          creativeId: '12346',
          mediaType: 'video',
          mediaTypes: {
            video: {
              context: 'instream',
              playerSize: [
                [
                  400,
                  100
                ]
              ]
            }
          },
          width: 640,
          height: 480,
          currency: 'USD',
          ttl: 3600,
          netRevenue: true,
          vastXml: '<?xml version=\"1.0\" encoding=\"UTF-8\"?><VAST xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:noNamespaceSchemaLocation=\"vast.xsd\" version=\"3.0\"> <Ad id=\"488427365\">  <InLine>   <AdSystem>Test</AdSystem>   <AdTitle>In-Stream Video</AdTitle> </InLine> </Ad></VAST',
          meta: {
            networkId: 51,
            brandId: 303326,
            brandName: 'OECTB',
            advertiserDomains: ['www.abcd.com']
          }
        }
      ];
      const result = spec.interpretResponse({ body: DEFAULT_VIDEO_BID_RESPONSE_WITH_XML_ADM }, {
        data: videoBidderRequest.data, validBidRequests: ONE_VIDEO
      });

      expect(result[0]).to.deep.equal(expectedParse[0]);
    });

    it('should not set vastxml when vasturl is present and when mtype is 2 (video)', function () {
      const expectedParse = [
        {
          requestId: '1a2b3c4e',
          cpm: 1.1,
          creativeId: '12346',
          mediaType: 'video',
          mediaTypes: {
            video: {
              context: 'instream',
              playerSize: [
                [
                  400,
                  100
                ]
              ]
            }
          },
          width: 640,
          height: 480,
          currency: 'USD',
          ttl: 3600,
          netRevenue: true,
          vastUrl: 'www.abcd.com/vast',
          meta: {
            networkId: 51,
            brandId: 303326,
            brandName: 'OECTB',
            advertiserDomains: ['www.abcd.com']
          }
        }
      ];
      const bid_response = DEFAULT_VIDEO_BID_RESPONSE_WITH_XML_ADM;
      bid_response.seatbid[0].bid[0].ext['vasturl'] = 'www.abcd.com/vast';
      const result = spec.interpretResponse({ body: bid_response }, {
        data: videoBidderRequest.data, validBidRequests: ONE_VIDEO
      });
      expect(result[0]).to.deep.equal(expectedParse[0]);
    });

    it('bidrequest should not have page if options is undefined', function () {
      const options = {};
      const validBidWithoutreferInfo = spec.buildRequests(DEFAULT_BANNER_VALID_BID, options);
      const requestWithoutreferInfo = extractPayload(validBidWithoutreferInfo[0]);

      const expectedURL = IX_SECURE_ENDPOINT + '?s=' + DEFAULT_BANNER_VALID_BID[0].params.siteId
      expect(requestWithoutreferInfo.site.page).to.be.undefined;
      expect(validBidWithoutreferInfo[0].url).to.equal(expectedURL);
    });

    it('bidrequest should not have page if options.refererInfo is an empty object', function () {
      const options = {
        refererInfo: {}
      };
      const validBidWithoutreferInfo = spec.buildRequests(DEFAULT_BANNER_VALID_BID, options);
      const requestWithoutreferInfo = extractPayload(validBidWithoutreferInfo[0]);

      const expectedURL = IX_SECURE_ENDPOINT + '?s=' + DEFAULT_BANNER_VALID_BID[0].params.siteId
      expect(requestWithoutreferInfo.site.page).to.be.undefined;
      expect(validBidWithoutreferInfo[0].url).to.equal(expectedURL);
    });

    it('bidrequest should sent to secure endpoint if page url is secure', function () {
      const options = {
        refererInfo: {
          referer: 'https://www.prebid.org'
        }
      };
      const validBidWithoutreferInfo = spec.buildRequests(DEFAULT_BANNER_VALID_BID, options);
      const requestWithoutreferInfo = extractPayload(validBidWithoutreferInfo[0]);

      const expectedURL = IX_SECURE_ENDPOINT + '?s=' + DEFAULT_BANNER_VALID_BID[0].params.siteId
      expect(requestWithoutreferInfo.site.page).to.equal(options.refererInfo.page);
      expect(validBidWithoutreferInfo[0].url).to.equal(expectedURL);
    });

    it('should set bid[].ttl to seatbid[].bid[].exp value from response', function () {
      const BANNER_RESPONSE_WITH_EXP = utils.deepClone(DEFAULT_BANNER_BID_RESPONSE);
      const VIDEO_RESPONSE_WITH_EXP = utils.deepClone(DEFAULT_VIDEO_BID_RESPONSE);
      VIDEO_RESPONSE_WITH_EXP.seatbid[0].bid[0].exp = 200;
      BANNER_RESPONSE_WITH_EXP.seatbid[0].bid[0].exp = 100;
      const bannerResult = spec.interpretResponse({ body: BANNER_RESPONSE_WITH_EXP }, bannerBidderRequest);
      const videoResult = spec.interpretResponse({ body: VIDEO_RESPONSE_WITH_EXP }, videoBidderRequest);

      expect(bannerResult[0].ttl).to.equal(100);
      expect(videoResult[0].ttl).to.equal(200);
    });

    it('should default bid[].ttl if seat[].bid[].exp is not in the resposne', function () {
      const bannerResult = spec.interpretResponse({ body: DEFAULT_BANNER_BID_RESPONSE }, bannerBidderRequest);
      const videoResult = spec.interpretResponse({ body: DEFAULT_VIDEO_BID_RESPONSE }, videoBidderRequest);

      expect(bannerResult[0].ttl).to.equal(300);
      expect(videoResult[0].ttl).to.equal(3600);
    });

    it('should get correct bid response for native ad', function () {
      const expectedParse = [
        {
          requestId: '1a2b3c4d',
          cpm: 1,
          creativeId: '12345',
          mediaType: 'native',
          width: 1,
          height: 1,
          currency: 'USD',
          netRevenue: true,
          meta: {
            networkId: 50,
            brandId: 303325,
            brandName: 'OECTA',
            advertiserDomains: ['www.abc.com']
          },
          native: {
            ortb: {
              assets: [
                {
                  'id': 0,
                  'img': {
                    'h': 250,
                    'url': 'https://cdn.liftoff.io/customers/1209/creatives/2501-icon-250x250.png',
                    'w': 250
                  }
                },
                {
                  'id': 1,
                  'img': {
                    'h': 627,
                    'url': 'https://cdn.liftoff.io/customers/5a9cab9cc6/image/lambda_png/a0355879b06c09b09232.png',
                    'w': 1200
                  }
                },
                {
                  'data': {
                    'value': 'autodoc.co.uk'
                  },
                  'id': 2
                },
                {
                  'data': {
                    'value': 'Les pièces automobiles dont vous avez besoin, toujours sous la main.'
                  },
                  'id': 3
                },
                {
                  'id': 4,
                  'title': {
                    'text': 'Autodoc'
                  }
                },
                {
                  'id': 5,
                  'video': {
                    'vasttag': '<VAST>blah</VAST>'
                  }
                }
              ],
              'eventtrackers': [
                {
                  'event': 1,
                  'method': 1,
                  'url': 'https://impression-europe.liftoff.io/index/impression'
                },
                {
                  'event': 1,
                  'method': 1,
                  'url': 'https://a701.casalemedia.com/impression/v1'
                }
              ],
              'link': {
                'clicktrackers': [
                  'https://click.liftoff.io/v1/campaign_click/blah'
                ],
                'url': 'https://play.google.com/store/apps/details?id=de.autodoc.gmbh'
              },
              'privacy': 'https://privacy.link.com',
              'ver': '1.2'
            }
          },
          ttl: 3600
        }
      ];
      const result = spec.interpretResponse({ body: DEFAULT_NATIVE_BID_RESPONSE }, nativeBidderRequest);
      expect(result[0]).to.deep.equal(expectedParse[0]);
    });

    describe('Auction config response', function () {
      let bidderRequestWithFledgeEnabled;
      let serverResponseWithoutFledgeConfigs;
      let serverResponseWithFledgeConfigs;
      let serverResponseWithMalformedAuctionConfig;
      let serverResponseWithMalformedAuctionConfigs;

      beforeEach(() => {
        bidderRequestWithFledgeEnabled = spec.buildRequests(DEFAULT_BANNER_VALID_BID_WITH_FLEDGE_ENABLED, {})[0];
        bidderRequestWithFledgeEnabled.paapi = {enabled: true};

        serverResponseWithoutFledgeConfigs = {
          body: {
            ...DEFAULT_BANNER_BID_RESPONSE
          }
        };

        serverResponseWithFledgeConfigs = {
          body: {
            ...DEFAULT_BANNER_BID_RESPONSE,
            ext: {
              protectedAudienceAuctionConfigs: [
                {
                  bidId: '59f219e54dc2fc',
                  config: {
                    seller: 'https://seller.test.indexexchange.com',
                    decisionLogicUrl: 'https://seller.test.indexexchange.com/decision-logic.js',
                    interestGroupBuyers: ['https://buyer.test.indexexchange.com'],
                    sellerSignals: {
                      callbackURL: 'https://test.com/ig/v1/ck74j8bcvc9c73a8eg6g'
                    },
                    perBuyerSignals: {
                      'https://buyer.test.indexexchange.com': {}
                    }
                  }
                }
              ]
            }
          }
        };

        serverResponseWithMalformedAuctionConfig = {
          body: {
            ...DEFAULT_BANNER_BID_RESPONSE,
            ext: {
              protectedAudienceAuctionConfigs: ['malformed']
            }
          }
        };

        serverResponseWithMalformedAuctionConfigs = {
          body: {
            ...DEFAULT_BANNER_BID_RESPONSE,
            ext: {
              protectedAudienceAuctionConfigs: 'malformed'
            }
          }
        };
      });

      it('should correctly interpret response with auction configs', () => {
        const result = spec.interpretResponse(serverResponseWithFledgeConfigs, bidderRequestWithFledgeEnabled);
        const expectedOutput = [
          {
            bidId: '59f219e54dc2fc',
            config: {
              ...serverResponseWithFledgeConfigs.body.ext.protectedAudienceAuctionConfigs[0].config,
              perBuyerSignals: {
                'https://buyer.test.indexexchange.com': {}
              }
            }
          }
        ];
        expect(result.paapi).to.deep.equal(expectedOutput);
      });

      it('should correctly interpret response without auction configs', () => {
        const result = spec.interpretResponse(serverResponseWithoutFledgeConfigs, bidderRequestWithFledgeEnabled);
        expect(result.paapi).to.be.undefined;
      });

      it('should handle malformed auction configs gracefully', () => {
        const result = spec.interpretResponse(serverResponseWithMalformedAuctionConfig, bidderRequestWithFledgeEnabled);
        expect(result.paapi).to.be.empty;
      });

      it('should log warning for malformed auction configs', () => {
        const logWarnSpy = sinon.spy(utils, 'logWarn');
        spec.interpretResponse(serverResponseWithMalformedAuctionConfig, bidderRequestWithFledgeEnabled);
        expect(logWarnSpy.calledWith('Malformed auction config detected:', 'malformed')).to.be.true;
        logWarnSpy.restore();
      });

      it('should return bids when protected audience auction conigs is malformed', () => {
        const result = spec.interpretResponse(serverResponseWithMalformedAuctionConfigs, bidderRequestWithFledgeEnabled);
        expect(result.paapi).to.be.undefined;
        expect(result.length).to.be.greaterThan(0);
      });
    });

    describe('interpretResponse when server response is empty', function() {
      let serverResponseWithoutBody;
      let serverResponseWithoutSeatbid;
      let bidderRequestWithFledgeEnabled;
      let bidderRequestWithoutFledgeEnabled;

      beforeEach(() => {
        serverResponseWithoutBody = {};

        serverResponseWithoutSeatbid = {
          body: {}
        };

        bidderRequestWithFledgeEnabled = spec.buildRequests(DEFAULT_BANNER_VALID_BID_WITH_FLEDGE_ENABLED, {})[0];
        bidderRequestWithFledgeEnabled.paapi = {enabled: true};

        bidderRequestWithoutFledgeEnabled = spec.buildRequests(DEFAULT_BANNER_VALID_BID, {})[0];
      });

      it('should return empty bids when response does not have body', function () {
        let result = spec.interpretResponse(serverResponseWithoutBody, bidderRequestWithFledgeEnabled);
        expect(result).to.deep.equal([]);
        result = spec.interpretResponse(serverResponseWithoutBody, bidderRequestWithoutFledgeEnabled);
        expect(result).to.deep.equal([]);
      });

      it('should return empty bids when response body does not have seatbid', function () {
        let result = spec.interpretResponse(serverResponseWithoutSeatbid, bidderRequestWithFledgeEnabled);
        expect(result).to.deep.equal([]);
        result = spec.interpretResponse(serverResponseWithoutSeatbid, bidderRequestWithoutFledgeEnabled);
        expect(result).to.deep.equal([]);
      });
    });
  });

  describe('bidrequest consent', function () {
    it('should have consent info if gdprApplies and consentString exist', function () {
      const validBidWithConsent = spec.buildRequests(DEFAULT_BANNER_VALID_BID, DEFAULT_OPTION);
      const requestWithConsent = extractPayload(validBidWithConsent[0]);

      expect(requestWithConsent.regs.ext.gdpr).to.equal(1);
      expect(requestWithConsent.user.ext.consent).to.equal('3huaa11=qu3198ae');
    });

    it('should not have consent field if consentString is undefined', function () {
      const options = {
        gdprConsent: {
          gdprApplies: true,
          vendorData: {}
        }
      };
      const validBidWithConsent = spec.buildRequests(DEFAULT_BANNER_VALID_BID, options);
      const requestWithConsent = extractPayload(validBidWithConsent[0]);

      expect(requestWithConsent.regs.ext.gdpr).to.equal(1);
      expect(requestWithConsent.user).to.be.undefined;
    });

    it('should not have gdpr field if gdprApplies is undefined', function () {
      const options = {
        gdprConsent: {
          consentString: '3huaa11=qu3198ae',
          vendorData: {}
        }
      };
      const validBidWithConsent = spec.buildRequests(DEFAULT_BANNER_VALID_BID, options);
      const requestWithConsent = extractPayload(validBidWithConsent[0]);

      expect(requestWithConsent.regs).to.be.undefined;
      expect(requestWithConsent.user.ext.consent).to.equal('3huaa11=qu3198ae');
    });

    it('should not have consent info if options.gdprConsent is undefined', function () {
      const options = {};
      const validBidWithConsent = spec.buildRequests(DEFAULT_BANNER_VALID_BID, options);
      const requestWithConsent = extractPayload(validBidWithConsent[0]);

      expect(requestWithConsent.regs).to.be.undefined;
      expect(requestWithConsent.user).to.be.undefined;
    });

    it('should have us_privacy if uspConsent is defined', function () {
      const options = {
        uspConsent: '1YYN'
      };
      const validBidWithUspConsent = spec.buildRequests(DEFAULT_BANNER_VALID_BID, options);
      const requestWithUspConsent = extractPayload(validBidWithUspConsent[0]);

      expect(requestWithUspConsent.regs.ext.us_privacy).to.equal('1YYN');
    });

    it('should not have us_privacy if uspConsent undefined', function () {
      const options = {};
      const validBidWithUspConsent = spec.buildRequests(DEFAULT_BANNER_VALID_BID, options);
      const requestWithUspConsent = extractPayload(validBidWithUspConsent[0]);

      expect(requestWithUspConsent.regs).to.be.undefined;
    });

    it('should have both gdpr and us_privacy if both are defined', function () {
      const options = {
        gdprConsent: {
          gdprApplies: true,
          vendorData: {}
        },
        uspConsent: '1YYN'
      };
      const validBidWithConsent = spec.buildRequests(DEFAULT_BANNER_VALID_BID, options);
      const requestWithConsent = extractPayload(validBidWithConsent[0]);
      expect(requestWithConsent.regs.ext.gdpr).to.equal(1);
      expect(requestWithConsent.regs.ext.us_privacy).to.equal('1YYN');
    });

    it('should contain `consented_providers_settings.addtl_consent` & consent on user.ext when both are provided', function () {
      const options = {
        gdprConsent: {
          consentString: '3huaa11=qu3198ae',
          addtlConsent: '1~1.35.41.101',
        }
      };

      const validBidWithConsent = spec.buildRequests(DEFAULT_BANNER_VALID_BID, options);
      const requestWithConsent = extractPayload(validBidWithConsent[0]);
      expect(requestWithConsent.user.ext.consented_providers_settings.addtl_consent).to.equal('1~1.35.41.101');
      expect(requestWithConsent.user.ext.consent).to.equal('3huaa11=qu3198ae');
    });

    it('should not contain `consented_providers_settings.addtl_consent` on user.ext when consent is not provided', function () {
      const options = {
        gdprConsent: {
          addtlConsent: '1~1.35.41.101',
        }
      };

      const validBidWithConsent = spec.buildRequests(DEFAULT_BANNER_VALID_BID, options);
      const requestWithConsent = extractPayload(validBidWithConsent[0]);
      expect(utils.deepAccess(requestWithConsent, 'user.ext.consented_providers_settings.addtl_consent')).to.not.exist;
      expect(utils.deepAccess(requestWithConsent, 'user.ext.consent')).to.not.exist;
    });

    it('should set coppa to 1 in config when enabled', () => {
      config.setConfig({ coppa: true })
      const bid = spec.buildRequests(DEFAULT_BANNER_VALID_BID, DEFAULT_OPTION);
      const r = extractPayload(bid[0]);

      expect(r.regs.coppa).to.equal(1);
    });
    it('should not set coppa in config when disabled', () => {
      config.setConfig({ coppa: false })
      const bid = spec.buildRequests(DEFAULT_BANNER_VALID_BID, DEFAULT_OPTION);
      const r = extractPayload(bid[0]);

      expect(r.regs.coppa).to.be.undefined;
    });
    it('should not set coppa when not specified in config', () => {
      config.resetConfig();
      const bid = spec.buildRequests(DEFAULT_BANNER_VALID_BID, DEFAULT_OPTION);
      const r = extractPayload(bid[0]);

      expect(r.regs.coppa).to.be.undefined;
    });
  });

  describe('Features', () => {
    let localStorageValues = {};
    let sandbox = sinon.createSandbox();
    let setDataInLocalStorageStub;
    let getDataFromLocalStorageStub;
    let removeDataFromLocalStorageStub;
    const serverResponse = {
      body: {
        ext: {
          features: {
            test: {
              activated: false
            }
          }
        }
      }
    };

    beforeEach(() => {
      localStorageValues = {};
      sandbox = sinon.createSandbox();
      setDataInLocalStorageStub = sandbox.stub(storage, 'setDataInLocalStorage').callsFake((key, value) => localStorageValues[key] = value);
      getDataFromLocalStorageStub = sandbox.stub(storage, 'getDataFromLocalStorage').callsFake((key) => localStorageValues[key]);
      removeDataFromLocalStorageStub = sandbox.stub(storage, 'removeDataFromLocalStorage').callsFake((key) => delete localStorageValues[key]);
    });

    afterEach(() => {
      setDataInLocalStorageStub.restore();
      getDataFromLocalStorageStub.restore();
      removeDataFromLocalStorageStub.restore();
      serverResponse.body.ext.features = {
        test: {
          activated: false
        }
      };
      localStorageValues = {};
      sandbox.restore();
    });

    it('should store features in internal cache', () => {
      FEATURE_TOGGLES.setFeatureToggles(serverResponse);
      expect(FEATURE_TOGGLES.isFeatureEnabled('test')).to.be.false;
    });

    it('should retrieve features from internal cache', () => {
      const feature = {
        ext: {
          features: {
            test: {
              activated: true
            }
          }
        }
      }
      FEATURE_TOGGLES.setFeatureToggles(feature);
      feature.ext.features.test.activated = false;
      FEATURE_TOGGLES.featureToggles = {
        features: feature.ext.features
      };
      expect(FEATURE_TOGGLES.isFeatureEnabled('test')).to.be.false;
    });

    it('should store features in localstorage when enabled', () => {
      sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
      serverResponse.body.ext.features.test.activated = true;
      FEATURE_TOGGLES.setFeatureToggles(serverResponse);

      const lsData = JSON.parse(storage.getDataFromLocalStorage(LOCAL_STORAGE_FEATURE_TOGGLES_KEY));
      expect(lsData.features.test.activated).to.be.true;
    });

    it('should retrieve features from localstorage when enabled', () => {
      sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
      serverResponse.body.ext.features.test.activated = true;
      FEATURE_TOGGLES.setFeatureToggles(serverResponse);
      FEATURE_TOGGLES.featureToggles = {};
      FEATURE_TOGGLES.getFeatureToggles(LOCAL_STORAGE_FEATURE_TOGGLES_KEY);
      expect(FEATURE_TOGGLES.isFeatureEnabled('test')).to.be.true;
    });

    it('should remove features from after expiry', () => {
      sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
      const expiryTime = new Date();
      localStorageValues = {
        expiry: expiryTime.setHours(expiryTime.getHours() - 2),
        features: {
          test: {
            activated: true
          }
        }
      }
      FEATURE_TOGGLES.getFeatureToggles(LOCAL_STORAGE_FEATURE_TOGGLES_KEY);
      expect(FEATURE_TOGGLES.isFeatureEnabled('test')).to.be.false;
      expect(FEATURE_TOGGLES.featureToggles).to.deep.equal({});
    });

    it('6 ad units should generate only 1 request if buildRequestV2 FT is enabled', function () {
      sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
      serverResponse.body.ext.features.pbjs_use_buildRequestV2 = {
        activated: true
      };
      FEATURE_TOGGLES.setFeatureToggles(serverResponse);

      const bid1 = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid1.mediaTypes.banner.sizes = LARGE_SET_OF_SIZES;
      bid1.params.siteId = '121';
      bid1.adUnitCode = 'div-gpt-1'
      bid1.transactionId = 'tr1';
      bid1.bidId = '2f6g5s5e';

      const bid2 = utils.deepClone(bid1);
      bid2.transactionId = 'tr2';

      const bid3 = utils.deepClone(bid1);
      bid3.transactionId = 'tr3';

      const bid4 = utils.deepClone(bid1);
      bid4.transactionId = 'tr4';

      const bid5 = utils.deepClone(bid1);
      bid5.transactionId = 'tr5';

      const bid6 = utils.deepClone(bid1);
      bid6.transactionId = 'tr6';

      const requests = spec.buildRequests([bid1, bid2, bid3, bid4, bid5, bid6], DEFAULT_OPTION);

      expect(requests).to.be.an('array');
      // buildRequestv2 enabled causes only 1 requests to get generated.
      expect(requests).to.have.lengthOf(1);
      for (const request of requests) {
        expect(request.method).to.equal('POST');
      }
    });

    it('1 request with 2 ad units, buildRequestV2 enabled', function () {
      sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
      serverResponse.body.ext.features.pbjs_use_buildRequestV2 = {
        activated: true
      };
      FEATURE_TOGGLES.setFeatureToggles(serverResponse);

      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid.mediaTypes.banner.sizes = LARGE_SET_OF_SIZES;
      bid.params.siteId = '124';
      bid.adUnitCode = 'div-gpt-1'
      bid.transactionId = '152e36d1-1241-4242-t35e-y1dv34d12315';
      bid.bidId = '2f6g5s5e';

      const requests = spec.buildRequests([bid, DEFAULT_BANNER_VALID_BID[0]], DEFAULT_OPTION);
      expect(requests).to.be.an('array');
      expect(requests).to.have.lengthOf(1);
    });

    it('request should have requested feature toggles when local storage is enabled', function () {
      sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      const requests = spec.buildRequests([bid, DEFAULT_BANNER_VALID_BID[0]], DEFAULT_OPTION);
      const r = extractPayload(requests[0]);
      expect(r.ext.features).to.exist;
      expect(Object.keys(r.ext.features).length).to.equal(FEATURE_TOGGLES.REQUESTED_FEATURE_TOGGLES.length);
    });

    it('request should have requested feature toggles when local storage is not enabled', function () {
      sandbox.stub(storage, 'localStorageIsEnabled').returns(false);
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      const requests = spec.buildRequests([bid, DEFAULT_BANNER_VALID_BID[0]], DEFAULT_OPTION);
      const r = extractPayload(requests[0]);
      expect(r.ext.features).to.exist;
      expect(Object.keys(r.ext.features).length).to.equal(FEATURE_TOGGLES.REQUESTED_FEATURE_TOGGLES.length);
    });

    it('request should not have any feature toggles when there is no requested feature toggle', function () {
      sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      FEATURE_TOGGLES.REQUESTED_FEATURE_TOGGLES = []
      const requests = spec.buildRequests([bid, DEFAULT_BANNER_VALID_BID[0]], DEFAULT_OPTION);
      const r = extractPayload(requests[0]);
      expect(r.ext.features).to.be.undefined;
    });

    it('request should not have any feature toggles when there is no requested feature toggle and local storage not enabled', function () {
      sandbox.stub(storage, 'localStorageIsEnabled').returns(false);
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      const requests = spec.buildRequests([bid, DEFAULT_BANNER_VALID_BID[0]], DEFAULT_OPTION);
      const r = extractPayload(requests[0]);
      FEATURE_TOGGLES.REQUESTED_FEATURE_TOGGLES = []
      expect(r.ext.features).to.be.undefined;
    });

    it('correct activation status of requested feature toggles when local storage not enabled', function () {
      sandbox.stub(storage, 'localStorageIsEnabled').returns(false);
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      FEATURE_TOGGLES.REQUESTED_FEATURE_TOGGLES = ['test1']
      const requests = spec.buildRequests([bid, DEFAULT_BANNER_VALID_BID[0]], DEFAULT_OPTION);
      const r = extractPayload(requests[0]);
      expect(r.ext.features).to.deep.equal({
        [FEATURE_TOGGLES.REQUESTED_FEATURE_TOGGLES[0]]: { activated: false }
      });
    });

    it('correct activation status of requested feature toggles', function () {
      sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
      serverResponse.body.ext.features = {
        [FEATURE_TOGGLES.REQUESTED_FEATURE_TOGGLES[0]]: {
          activated: true
        }
      }
      FEATURE_TOGGLES.setFeatureToggles(serverResponse);
      let bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      let requests = spec.buildRequests([bid, DEFAULT_BANNER_VALID_BID[0]], DEFAULT_OPTION);
      let r = extractPayload(requests[0]);
      expect(r.ext.features).to.deep.equal({
        [FEATURE_TOGGLES.REQUESTED_FEATURE_TOGGLES[0]]: { activated: true }
      });

      serverResponse.body.ext.features = {
        [FEATURE_TOGGLES.REQUESTED_FEATURE_TOGGLES[0]]: {
          activated: false
        }
      }
      FEATURE_TOGGLES.setFeatureToggles(serverResponse);
      bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      requests = spec.buildRequests([bid, DEFAULT_BANNER_VALID_BID[0]], DEFAULT_OPTION);
      r = extractPayload(requests[0]);
      expect(r.ext.features).to.deep.equal({
        [FEATURE_TOGGLES.REQUESTED_FEATURE_TOGGLES[0]]: { activated: false }
      });
    });

    describe('multiformat tests with enable multiformat ft enabled', () => {
      let ftStub;
      let validBids;
      beforeEach(() => {
        ftStub = sinon.stub(FEATURE_TOGGLES, 'isFeatureEnabled').callsFake((ftName) => {
          if (ftName == 'pbjs_enable_multiformat') {
            return true;
          }
          return false;
        });
        validBids = DEFAULT_MULTIFORMAT_VALID_BID;
      });

      afterEach(() => {
        ftStub.restore();
        validBids = DEFAULT_MULTIFORMAT_VALID_BID;
      });

      it('banner multiformat request, should generate banner imp', () => {
        const request = spec.buildRequests(DEFAULT_MULTIFORMAT_BANNER_VALID_BID, {})
        const imp = extractPayload(request[0]).imp[0];
        const bannerImpression = imp.banner
        expect(request).to.have.lengthOf(1);
        expect(extractPayload(request[0]).imp).to.have.lengthOf(1);
        expect(imp.id).to.equal(DEFAULT_MULTIFORMAT_BANNER_VALID_BID[0].bidId);
        expect(bannerImpression.format[0].w).to.equal(DEFAULT_MULTIFORMAT_BANNER_VALID_BID[0].params.size[0]);
        expect(bannerImpression.format[0].h).to.equal(DEFAULT_MULTIFORMAT_BANNER_VALID_BID[0].params.size[1]);
      });
      it('should generate video impression', () => {
        const request = spec.buildRequests(DEFAULT_MULTIFORMAT_VIDEO_VALID_BID, {});
        const imp = extractPayload(request[0]).imp[0];
        const videoImp = imp.video
        expect(request).to.have.lengthOf(1);
        expect(extractPayload(request[0]).imp).to.have.lengthOf(1);
        expect(imp.id).to.equal(DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0].bidId);
        expect(videoImp.w).to.equal(DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0].params.size[0]);
        expect(videoImp.h).to.equal(DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0].params.size[1]);
      });
      it('different ad units, should only have 1 request', () => {
        const bids = [DEFAULT_MULTIFORMAT_BANNER_VALID_BID[0], DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0]];
        const request = spec.buildRequests(bids, {});
        expect(request).to.have.lengthOf(1);
      });
      it('should return valid banner requests', function () {
        const bids = [DEFAULT_MULTIFORMAT_BANNER_VALID_BID[0], DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0]];
        const request = spec.buildRequests(bids, {});
        const impressions = extractPayload(request[0]).imp;
        expect(impressions).to.have.lengthOf(2);

        expect(impressions[0].id).to.equal(bids[0].bidId);
        expect(impressions[0].banner.format).to.be.length(bids[0].mediaTypes.banner.sizes.length);
        expect(impressions[0].banner.topframe).to.be.oneOf([0, 1]);
        expect(impressions[0].ext.siteID).to.equal('123');
        expect(impressions[1].ext.siteID).to.equal('456');
        impressions[0].banner.format.map(({ w, h, ext }, index) => {
          const size = bids[0].mediaTypes.banner.sizes[index];

          expect(w).to.equal(size[0]);
          expect(h).to.equal(size[1]);
          expect(ext.siteID).to.be.undefined;
        });

        impressions[1].banner.format.map(({ w, h, ext }, index) => {
          const size = bids[1].mediaTypes.banner.sizes[index];

          expect(w).to.equal(size[0]);
          expect(h).to.equal(size[1]);
          expect(ext.siteID).to.be.undefined;
        });
      });
      it('banner / native multiformat request, only 1 request expect 1 imp', () => {
        const request = spec.buildRequests(DEFAULT_MULTIFORMAT_NATIVE_VALID_BID, {});
        expect(request).to.have.lengthOf(1);
        const imp = extractPayload(request[0]).imp[0];
        expect(extractPayload(request[0]).imp).to.have.lengthOf(1);
        expect(imp.banner).to.exist;
        expect(imp.native).to.exist;
      });

      it('should return valid banner and video requests', function () {
        const bids = [DEFAULT_MULTIFORMAT_BANNER_VALID_BID[0], DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0]];
        const request = spec.buildRequests(bids, {});
        const videoImpression = extractPayload(request[0]).imp[1];

        expect(extractPayload(request[0]).imp).to.have.lengthOf(2);
        expect(videoImpression.id).to.equal(DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0].bidId);
        expect(videoImpression.video.w).to.equal(DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0].mediaTypes.video.playerSize[0][0]);
        expect(videoImpression.video.h).to.equal(DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0].mediaTypes.video.playerSize[0][1]);
      });

      it('multiformat banner / video - bid floors', function () {
        const bids = [DEFAULT_MULTIFORMAT_BANNER_VALID_BID[0], DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0]];
        bids[0].params.bidFloor = 2.35;
        bids[0].params.bidFloorCur = 'USD';
        const adunitcode = bids[1].adUnitCode;
        bids[1].adUnitCode = bids[0].adUnitCode;
        bids[1].params.bidFloor = 2.05;
        bids[1].params.bidFloorCur = 'USD';
        const request = spec.buildRequests(bids, {});

        expect(extractPayload(request[0]).imp).to.have.lengthOf(1);
        expect(extractPayload(request[0]).imp[0].bidfloor).to.equal(2.05);
        expect(extractPayload(request[0]).imp[0].bidfloorcur).to.equal('USD');
        expect(extractPayload(request[0]).imp[0].video.ext.bidfloor).to.equal(2.05);
        expect(extractPayload(request[0]).imp[0].banner.format[0].ext.bidfloor).to.equal(2.35);
        bids[1].adUnitCode = adunitcode;
      });

      it('multiformat banner / native - bid floors', function () {
        const bids = [DEFAULT_MULTIFORMAT_BANNER_VALID_BID[0], DEFAULT_MULTIFORMAT_NATIVE_VALID_BID[0]];
        bids[0].params.bidFloor = 2.35;
        bids[0].params.bidFloorCur = 'USD';
        const adunitcode = bids[1].adUnitCode;
        bids[1].adUnitCode = bids[0].adUnitCode;
        bids[1].params.bidFloor = 2.05;
        bids[1].params.bidFloorCur = 'USD';
        const request = spec.buildRequests(bids, {});

        expect(extractPayload(request[0]).imp).to.have.lengthOf(1);
        expect(extractPayload(request[0]).imp[0].bidfloor).to.equal(2.05);
        expect(extractPayload(request[0]).imp[0].bidfloorcur).to.equal('USD');
        expect(extractPayload(request[0]).imp[0].native.ext.bidfloor).to.equal(2.05);
        bids[1].adUnitCode = adunitcode;
      });

      it('multiformat banner / native - bid floors, banner imp less', function () {
        const bids = [DEFAULT_MULTIFORMAT_BANNER_VALID_BID[0], DEFAULT_MULTIFORMAT_NATIVE_VALID_BID[0]];
        bids[0].params.bidFloor = 2.05;
        bids[0].params.bidFloorCur = 'USD';
        const adunitcode = bids[1].adUnitCode;
        bids[1].adUnitCode = bids[0].adUnitCode;
        bids[1].params.bidFloor = 2.35;
        bids[1].params.bidFloorCur = 'USD';
        const request = spec.buildRequests(bids, {});

        expect(extractPayload(request[0]).imp).to.have.lengthOf(1);
        expect(extractPayload(request[0]).imp[0].bidfloor).to.equal(2.05);
        expect(extractPayload(request[0]).imp[0].bidfloorcur).to.equal('USD');
        expect(extractPayload(request[0]).imp[0].native.ext.bidfloor).to.equal(2.35);
        bids[1].adUnitCode = adunitcode;
      });

      it('should return valid banner and video requests, different adunit, creates multiimp request', function () {
        const bid = DEFAULT_MULTIFORMAT_VALID_BID[0]
        bid.bidId = '1abcdef'
        const bids = [DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0], bid];
        const request = spec.buildRequests(bids, {});
        expect(request).to.have.lengthOf(1);
        expect(extractPayload(request[0]).imp).to.have.lengthOf(2);
      });

      it('should return valid  video requests, different adunit, creates multiimp request', function () {
        const bid = DEFAULT_BANNER_VALID_BID[0]
        bid.bidId = '1abcdef'
        const bids = [DEFAULT_VIDEO_VALID_BID[0], bid];
        const request = spec.buildRequests(bids, {});
        expect(request).to.have.lengthOf(1);
        expect(extractPayload(request[0]).imp).to.have.lengthOf(2);
      });

      it('should contain all correct IXdiag properties', function () {
        const bids = [DEFAULT_MULTIFORMAT_BANNER_VALID_BID[0], DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0]];
        const request = spec.buildRequests(bids, {});
        const diagObj = extractPayload(request[0]).ext.ixdiag;
        expect(diagObj.iu).to.equal(0);
        expect(diagObj.nu).to.equal(0);
        expect(diagObj.ou).to.equal(2);
        expect(diagObj.ren).to.equal(true);
        expect(diagObj.mfu).to.equal(2);
        expect(diagObj.allu).to.equal(2);
        expect(diagObj.version).to.equal('$prebid.version$');
        expect(diagObj.url).to.equal('http://localhost:9876/context.html')
        expect(diagObj.tagid).to.equal(DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0].params.tagId)
        expect(diagObj.adunitcode).to.equal(DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0].adUnitCode)
      });

      it('should use siteId override for multiformat', function () {
        validBids[0].params = {
          tagId: '123',
          siteId: '456',
          size: [300, 250],
          video: {
            siteId: '1111'
          },
          banner: {
            siteId: '2222'
          },
          native: {
            siteId: '3333'
          }
        }
        const request = spec.buildRequests(validBids, {});
        const imp = request[0].data.imp[0];
        expect(imp.ext.siteID).to.equal('2222');
        expect(imp.video.ext.siteID).to.be.undefined;
        imp.banner.format.map(({ ext }) => {
          expect(ext.siteID).to.be.undefined;
        });
        expect(imp.native.ext.siteID).to.be.undefined;
      });

      it('should use default siteId if overrides are not provided for multiformat', function () {
        const bids = validBids;
        delete bids[0].params.banner;
        delete bids[0].params.video;
        delete bids[0].params.native;
        const request = spec.buildRequests(bids, {});
        const imp = request[0].data.imp[0]
        expect(imp.video.ext.siteID).to.be.undefined;
        imp.banner.format.map(({ ext }) => {
          expect(ext.siteID).to.be.undefined;
        });
        expect(imp.native.ext.siteID).to.be.undefined;
        expect(imp.ext.siteID).to.equal('456');
      });
    });
  });

  describe('combine imps test', function () {
    it('base test', function () {
      const imps = [
        {
          'b8c6b5d5-76a1-4a90-b635-0c7eae1bfaa7': {
            'tid': 'b8c6b5d5-76a1-4a90-b635-0c7eae1bfaa7',
            'adUnitCode': 'div-gpt-v1',
            'missingImps': [
              {
                'id': '2e46cbd7d4e046',
                'ext': {
                  'siteID': '12345'
                },
                'banner': {
                  'w': 300,
                  'h': 250,
                  'topframe': 1
                }
              }
            ],
            'missingCount': 1
          }
        },
        {
          'b8c6b5d5-76a1-4a90-b635-0c7eae1bfaa7': {
            'ixImps': [
              {
                'id': '2e46cbd7d4e046',
                'ext': {
                  'siteID': '12345',
                  'tid': 'b8c6b5d5-76a1-4a90-b635-0c7eae1bfaa7'
                },
                'video': {
                  'skipppable': false,
                  'playback_methods': [
                    'auto_play_sound_off'
                  ],
                  'minduration': 0,
                  'maxduration': 30,
                  'mimes': [
                    'video/mp4',
                    'video/x-flv'
                  ],
                  'placement': 1,
                  'playerSize': [
                    [
                      640,
                      480
                    ]
                  ],
                  'protocols': [
                    6
                  ],
                  'w': 640,
                  'h': 480,
                  'ext': {
                    'siteID': '12345',
                    'tid': 'b8c6b5d5-76a1-4a90-b635-0c7eae1bfaa7'
                  }
                }
              },
            ],
            'adUnitCode': 'div-gpt-v1'
          }
        },
        {
          'b8c6b5d5-76a1-4a90-b635-0c7eae1bfaa7': {
            'tid': 'b8c6b5d5-76a1-4a90-b635-0c7eae1bfaa7',
            'adUnitCode': 'div-gpt-v1',
            'missingImps': [
              {
                'id': '2e46cbd7d4e046',
                'ext': {
                  'siteID': '12345'
                },
                'banner': {
                  'w': 300,
                  'h': 250,
                  'topframe': 1
                }
              }
            ],
            'missingCount': 1
          }
        }
      ]
      const result = combineImps(imps);
      expect(result['b8c6b5d5-76a1-4a90-b635-0c7eae1bfaa7'].ixImps.length).to.equal(1)
      expect(result['b8c6b5d5-76a1-4a90-b635-0c7eae1bfaa7'].missingImps.length).to.equal(2);
    });
    it('switch order', function () {
      const imps = [
        {
          'b8c6b5d5-76a1-4a90-b635-0c7eae1bfaa7': {
            'ixImps': [
              {
                'id': '2e46cbd7d4e046',
                'ext': {
                  'siteID': '12345',
                  'tid': 'b8c6b5d5-76a1-4a90-b635-0c7eae1bfaa7'
                },
                'video': {
                  'skipppable': false,
                  'playback_methods': [
                    'auto_play_sound_off'
                  ],
                  'minduration': 0,
                  'maxduration': 30,
                  'mimes': [
                    'video/mp4',
                    'video/x-flv'
                  ],
                  'placement': 1,
                  'playerSize': [
                    [
                      640,
                      480
                    ]
                  ],
                  'protocols': [
                    6
                  ],
                  'w': 640,
                  'h': 480,
                  'ext': {
                    'siteID': '12345',
                    'tid': 'b8c6b5d5-76a1-4a90-b635-0c7eae1bfaa7'
                  }
                }
              },
            ],
            'adUnitCode': 'div-gpt-v1'
          }
        },
        {
          'b8c6b5d5-76a1-4a90-b635-0c7eae1bfaa7': {
            'tid': 'b8c6b5d5-76a1-4a90-b635-0c7eae1bfaa7',
            'adUnitCode': 'div-gpt-v1',
            'missingImps': [
              {
                'id': '2e46cbd7d4e046',
                'ext': {
                  'siteID': '12345'
                },
                'banner': {
                  'w': 300,
                  'h': 250,
                  'topframe': 1
                }
              }
            ],
            'missingCount': 1
          }
        }
      ]
      const result = combineImps(imps)
      expect(result['b8c6b5d5-76a1-4a90-b635-0c7eae1bfaa7'].missingImps.length).to.equal(1);
      expect(result['b8c6b5d5-76a1-4a90-b635-0c7eae1bfaa7'].ixImps.length).to.equal(1);
    });
  });

  describe('apply floors test', function () {
    it('video test', function() {
      const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID[0]);
      bid.params.bidFloor = 50;
      bid.params.bidFloorCur = 'USD';
      const imp = bidToVideoImp(bid);
      expect(imp.video.ext.bidfloor).to.equal(50);
      expect(imp.bidfloor).to.equal(50);
      expect(imp.bidfloorcur).to.equal('USD');
      expect(imp.video.ext.fl).to.equal('x');
    });
    it('native test', function() {
      const bid = utils.deepClone(DEFAULT_NATIVE_VALID_BID[0]);
      bid.params.bidFloor = 50;
      bid.params.bidFloorCur = 'USD';
      const imp = bidToNativeImp(bid);
      expect(imp.native.ext.bidfloor).to.equal(50);
      expect(imp.bidfloor).to.equal(50);
      expect(imp.bidfloorcur).to.equal('USD');
      expect(imp.native.ext.fl).to.equal('x');
    });
  });

  describe('deduplicateImpExtFields', () => {
    it('should remove duplicate keys from banner.ext', () => {
      const input = {
        imp: [
          {
            banner: {
              ext: {
                key1: 'value1',
                key2: 'value2',
                key3: 'value3',
                key4: 'value4', // duplicate value
              },
            },
            video: {
              ext: {
                key4: 'value4', // duplicate value
              }
            },
            ext: {
              key4: 'value4'
            }
          },
        ],
      };

      const expectedOutput = {
        imp: [
          {
            banner: {
              ext: {
                key1: 'value1',
                key2: 'value2',
                key3: 'value3',
              },
            },
            ext: {
              key4: 'value4'
            },
            video: {
              ext: {}
            },
          },
        ],
      };

      const result = deduplicateImpExtFields(input);
      expect(result).to.deep.equal(expectedOutput);
    });

    it('should remove duplicate keys from banner.format[].ext', () => {
      const input = {
        imp: [
          {
            banner: {
              format: [
                {
                  ext: {
                    key1: 'value1',
                    key2: 'value2',
                    key3: 'value3',
                    key4: 'value4', // duplicate value
                  },
                },
              ],
            },
            video: {
              ext: {
                key4: 'value4', // duplicate value
              }
            },
            ext: {
              key4: 'value4'
            }
          },
        ],
      };

      const expectedOutput = {
        imp: [
          {
            banner: {
              format: [
                {
                  ext: {
                    key1: 'value1',
                    key2: 'value2',
                    key3: 'value3',
                  },
                },
              ],
            },
            video: {
              ext: {}
            },
            ext: {
              key4: 'value4'
            }
          },
        ],
      };

      const result = deduplicateImpExtFields(input);
      expect(result).to.deep.equal(expectedOutput);
    });

    it('should remove duplicate keys from video.ext', () => {
      const input = {
        imp: [
          {
            video: {
              ext: {
                key1: 'value1',
                key2: 'value2',
                key3: 'value3',
                key4: 'value4', // duplicate value
              },
            },
            banner: {
              ext: {
                key1: 'value1',
              }
            },
            ext: {
              key4: 'value4'
            }
          },
        ],
      };

      const expectedOutput = {
        imp: [
          {
            video: {
              ext: {
                key1: 'value1',
                key2: 'value2',
                key3: 'value3',
              },
            },
            banner: {
              ext: {
                key1: 'value1',
              }
            },
            ext: {
              key4: 'value4'
            }
          },
        ],
      };

      const result = deduplicateImpExtFields(input);
      expect(result).to.deep.equal(expectedOutput);
    });

    it('should remove duplicate keys from native.ext', () => {
      const input = {
        imp: [
          {
            native: {
              ext: {
                key1: 'value1',
                key2: 'value2',
                key3: 'value3',
                key4: 'value4', // duplicate value
              },
            },
            banner: {
              ext: {
                key1: 'value1',
              }
            },
            ext: {
              key4: 'value4'
            }
          },
        ],
      };

      const expectedOutput = {
        imp: [
          {
            native: {
              ext: {
                key1: 'value1',
                key2: 'value2',
                key3: 'value3',
              },
            },
            banner: {
              ext: {
                key1: 'value1',
              }
            },
            ext: {
              key4: 'value4'
            }
          }
        ],
      };

      const result = deduplicateImpExtFields(input);
      expect(result).to.deep.equal(expectedOutput);
    });

    it('should return the input unchanged when there is no imp.ext', () => {
      const input = {
        imp: [
          {
            banner: {
              ext: {
                key1: 'value1',
                key2: 'value2',
                key3: 'value3',
              },
            },
            video: {
              ext: {
                key4: 'value4',
                key5: 'value5',
                key6: 'value6',
              },
            },
            native: {
              ext: {
                key7: 'value7',
                key8: 'value8',
                key9: 'value9',
              },
            },
          },
        ],
      };

      const result = deduplicateImpExtFields(input);
      expect(result).to.deep.equal(input);
    });
  });

  describe('removeSiteIDs', () => {
    it('should remove siteIDs from banner / video / native format', () => {
      const request = {
        imp: [
          {
            banner: {
              format: [
                {
                  ext: {
                    siteID: '123'
                  }
                },
                {
                  ext: {
                    siteID: '123'
                  }
                }
              ],
              ext: {
                siteID: '123'
              }
            },
            video: {
              ext: {
                siteID: '123'
              }
            },
            native: {
              ext: {
                siteID: '123'
              }
            },
            ext: {
              siteID: '123'
            }
          }
        ]
      };

      const expected = {
        ext: {
          ixdiag: {
            usid: true
          }
        },
        imp: [
          {
            banner: {
              format: [
                {
                  ext: {}
                },
                {
                  ext: {}
                }
              ],
              ext: {}
            },
            video: {
              ext: {}
            },
            native: {
              ext: {}
            },
            ext: {
              'siteID': '123'
            }
          }
        ]
      };

      expect(removeSiteIDs(request)).to.deep.equal(expected);
    });

    it('should not modify the request when imp.ext is not present', () => {
      const request = {
        imp: [
          {
            banner: {
              ext: {
                siteID: '123'
              }
            }
          }
        ]
      };

      const expected = {
        imp: [
          {
            banner: {
              ext: {
                siteID: '123'
              }
            },
          }
        ]
      };

      expect(removeSiteIDs(request)).to.deep.equal(expected);
    });
  });

  describe('addDeviceInfo', () => {
    it('should add device to request when device already exists', () => {
      let r = {
        device: {
          ip: '127.0.0.1'
        }
      }
      r = addDeviceInfo(r);
      expect(r.device.w).to.exist;
      expect(r.device.h).to.exist;
    });

    it('should add device to request when device doesnt exist', () => {
      let r = {}
      r = addDeviceInfo(r);
      expect(r.device.w).to.exist;
      expect(r.device.h).to.exist;
    });

    it('should add device.ip if available in fpd', () => {
      const ortb2 = {
        device: {
          ip: '192.168.1.1',
          ipv6: '2001:0db8:85a3:0000:0000:8a2e:0370:7334'
        }};
      const request = spec.buildRequests(DEFAULT_BANNER_VALID_BID, { ortb2 })[0];
      const payload = extractPayload(request);
      expect(payload.device.ip).to.equal('192.168.1.1')
      expect(payload.device.ipv6).to.equal('2001:0db8:85a3:0000:0000:8a2e:0370:7334')
    });

    it('should not add device.ip if neither ip nor ipv6 exists', () => {
      const ortb2 = {device: {}};
      const request = spec.buildRequests(DEFAULT_BANNER_VALID_BID, { ortb2 })[0];
      const payload = extractPayload(request);
      expect(payload.device.ip).to.be.undefined;
      expect(payload.device.ip6).to.be.undefined;
    });

    it('should add device.geo if available in fpd', () => {
      const ortb2 = {
        device: {
          geo: {
            lat: 1,
            lon: 2,
            lastfix: 1,
            type: 1
          }
        }
      };
      const request = spec.buildRequests(DEFAULT_BANNER_VALID_BID, { ortb2 })[0];
      const payload = extractPayload(request);
      expect(payload.device.geo.lat).to.equal(1);
      expect(payload.device.geo.lon).to.equal(2);
      expect(payload.device.geo.lastfix).to.equal(1);
      expect(payload.device.geo.type).to.equal(1);
    });

    it('should not add device.geo if it does not exist', () => {
      const ortb2 = {device: {}};
      const request = spec.buildRequests(DEFAULT_BANNER_VALID_BID, { ortb2 })[0];
      const payload = extractPayload(request);
      expect(payload.device.geo).to.be.undefined;
    });
  });

  describe('getDivIdFromAdUnitCode', () => {
    it('returns adUnitCode when element exists', () => {
      const adUnitCode = 'div-ad1';
      const el = document.createElement('div');
      el.id = adUnitCode;
      document.body.appendChild(el);
      expect(getDivIdFromAdUnitCode(adUnitCode)).to.equal(adUnitCode);
      document.body.removeChild(el);
    });

    it('retrieves divId from GPT once and caches result', () => {
      const adUnitCode = 'div-ad2';
      const stub = sinon.stub(gptUtils, 'getGptSlotInfoForAdUnitCode').returns({divId: 'gpt-div'});
      const first = getDivIdFromAdUnitCode(adUnitCode);
      const second = getDivIdFromAdUnitCode(adUnitCode);
      expect(first).to.equal('gpt-div');
      expect(second).to.equal('gpt-div');
      expect(stub.calledOnce).to.be.true;
      stub.restore();
    });
  });

  describe('fetch requests', function () {
    let ajaxStub;

    beforeEach(function () {
      ajaxStub = sinon.stub(ajaxLib, 'ajaxBuilder').callsFake(() => {
        return sinon.spy(function (url, callback, data, options) {
          callback.success('OK');
        });
      });
    });

    afterEach(function () {
      ajaxStub.restore();
    });

    it('should send the correct headers in the actual fetch call', function (done) {
      const requests = spec.buildRequests(DEFAULT_BANNER_VALID_BID, DEFAULT_OPTION);
      const request = requests[0];
      const ajax = ajaxLib.ajaxBuilder();

      ajax(
        request.url,
        {
          success: () => {
            try {
              sinon.assert.calledOnce(ajaxStub);
              const ajaxCall = ajaxStub.returnValues[0];
              sinon.assert.calledOnce(ajaxCall);
              const [calledUrl, callback, calledData, calledOptions] = ajaxCall.getCall(0).args;

              expect(calledUrl).to.equal(request.url);
              expect(calledData).to.equal(request.data);

              expect(calledOptions.contentType).to.equal('text/plain');
              expect(calledOptions.withCredentials).to.be.true;

              done();
            } catch (err) {
              done(err);
            }
          },
          error: (err) => done(err || new Error('Ajax request failed')),
        },
        request.data,
        request.options
      );
    });
  });
});

function exec(CONCERN_JAPAN, _target_month) {
  var month = (new Date()).getMonth()+1;
  var year = (new Date()).getYear()+1900;
  var CONCERN_JAPAN = (typeof CONCERN_JAPAN === 'undefined') ? true : CONCERN_JAPAN;
  var target_month = (typeof _target_month === 'undefined') ? month : _target_month;
  var BREAK_TIME = CONCERN_JAPAN ? '1:00' : '1:30';

  var MIN_WORK_TIME = 160;
  var MAX_WORK_TIME = 180;
  var HOUR_PER_DAY = 8;

  $.cwx.api({
    url: clearworks.constant.API_URI + '/payroll/employee-attendance/find-by-login-user?target_year='+year+'&target_month='+(target_month)+'',
    method: 'GET',
    onerror: function() { console.log('%c Không nhận được response từ server. Hủy!', 'background-color: red; color: black') },
    onsuccess: function (params, result1) {
      $.cwx.api({
        url: clearworks.constant.API_URI + '/payroll/employee-attendance/find-by-login-user?target_year='+(target_month == 12 ? (year+1) : year)+'&target_month='+(target_month == 12 ? 1 : (target_month+1))+'',
        method: 'GET',
        onerror: function() { console.log('%c Không nhận được response từ server. Hủy!', 'background-color: red; color: black') },
        onsuccess: function (params, result2) {
          var emp_name = result2.data.emp_name;
          var month_datas_1 = result1.data.attendance_dailies;
          var month_datas_2 = result2.data.attendance_dailies;
          var month_datas = [];
          var work_day_cnt = 0, fill_day_cnt = 0;
          _.map(_.union(month_datas_1, month_datas_2), function(data) {
            if ((new Date(data.work_date)).getMonth()+1 == target_month) {
              if (data.start_time && data.end_time) {
                work_day_cnt ++;
                if(data.start_time.length == 4) data.start_time = ' '+data.start_time;
                data.work_time = time_diff(data.start_time, data.end_time);
                if (data.start_time.split(':')[0] < 12) {
                  data.work_time = time_diff(BREAK_TIME, data.work_time);
                  data.work_hour = data.work_time.split(':')[0];
                  data.work_min = data.work_time.split(':')[1];
                }
                else {
                  data.work_hour = data.work_time.split(':')[0];
                  data.work_min = data.work_time.split(':')[1];
                  data.work_time += '(Nửa ngày)';
                }
              } else {
                data.start_time = data.start_time || '--:--';
                data.end_time = data.end_time || '--:--';
                data.work_time = '00:00';
                data.work_hour = 0;
                data.work_min = 0;
                if (!((new Date(data.work_date)).getDay() % 6 == 0 || (CONCERN_JAPAN && data.is_national_holiday))
                  && (new Date(data.work_date)) > (new Date()).setDate((new Date()).getDate()-1)) fill_day_cnt++;
              }
              month_datas.push(data);
            }
          })
          console.clear();
          console.log('%c            Data dùng cho excel', 'background-color: #FAFAFA; color: green; font-weight:bold:;');
          _.map(month_datas, function(data, key) {
            console.log(
              (data.start_time == '--:--' ? '' : data.start_time).trim()+','+(data.end_time == '--:--' ? '' : data.end_time).trim()
              );
          });
          console.log('%c            Thống kê giờ làm               ', 'background-color: #FAFAFA; color: green; font-weight:bold:;');
          console.log('%c Nhân viên: '+emp_name+' Tháng: '+target_month+'/'+year+' ', 'background-color: #5272ab; color: white;');
          console.log('%c__#____Ngày________B/đầu~K/Thúc__T/Gian____', 'background-color: white; color: black;');
          var sum_work_hour = 0, sum_work_min = 0;
          _.map(month_datas, function(data, key) {
            var idx = (key+1) > 9 ? (key+1) : ' '+(key+1);
            var bgcolor = ((new Date(data.work_date)).getDay() == 6 || (CONCERN_JAPAN && data.is_national_holiday)) ? 
                    '#add8e6' : ((new Date(data.work_date)).getDay() == 0) ? '#ffc14d' : 'white';
            console.log('%c '+idx+'  '+data.work_date+'     '+data.start_time+'~'+data.end_time+'    '+data.work_time+'  ',
               'background-color: '+bgcolor+'; color: black;');
            sum_work_hour += parseInt(data.work_hour);
            sum_work_min += parseInt(data.work_min);
          });
          sum_work_hour += Math.floor(sum_work_min/60);
          sum_work_min = sum_work_min - Math.floor(sum_work_min/60)*60;
          var predict_work_time = sum_work_hour + HOUR_PER_DAY*fill_day_cnt + 'giờ ' + sum_work_min+'phút';
          var needed_work_time = MIN_WORK_TIME - (sum_work_hour+1) - HOUR_PER_DAY*fill_day_cnt;
          var maybe_over_work_time = sum_work_hour + HOUR_PER_DAY*fill_day_cnt - MAX_WORK_TIME;
          console.log('%c    Số ngày đi làm：'+work_day_cnt+'　Tổng t/gian：'+sum_work_hour+':'+sum_work_min+' ', 'background-color: #5272ab; color: white;');
          console.log('%c                   ※ Đã trừ '+BREAK_TIME+' nghỉ trưa ', 'background-color: #5272ab; color: white;');
          if(needed_work_time > 0)
            console.log('%c    Dự tính tháng này sẽ thiếu ~'+needed_work_time+'h làm', 'color: red;');
          else 
            console.log('%c    Dự tính tháng này sẽ đủ giờ làm(dự tính đang là ~'+(predict_work_time)+')', 'background-color: #5272ab; color: skyblue;');
          if(maybe_over_work_time > 0)
            console.log('%c    Chú ý tháng này có thể quá ~'+maybe_over_work_time+'h làm', 'color: red;');
        },
      });
    },
  });
  var time_diff = function(tim1,tim2) {
    var ary1=tim1.split(':'),ary2=tim2.split(':');
    var minsdiff=parseInt(ary2[0],10)*60+parseInt(ary2[1],10)-parseInt(ary1[0],10)*60-parseInt(ary1[1],10);
    return (String(100+Math.floor(minsdiff/60)).substr(1)+':'+String(100+minsdiff%60).substr(1));
  }
}
//fetch('https://kiradev.me/tool/attendance-report/attendance_report.js',{cache: 'no-cache'}).then(response => response.text()).then(function(scode) {eval(scode); exec();});


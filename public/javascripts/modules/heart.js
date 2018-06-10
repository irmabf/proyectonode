import axios from 'axios';
import { $ } from './bling';

  function ajaxHeart(e) {
    //We stop the form from submit when we push the heart
    e.preventDefault();
    //Now we push the form but with js instead of with the browser

     //console.log('HEART ITTT!!!!!!!!!!!!!!!!');
     //console.log(this);
     axios
       .post(this.action)
       .then(res => {
         const isHearted = this.heart.classList.toggle('heart__button--hearted');
         $('.heart-count').textContent = res.data.hearts.length;
         if (isHearted) {
           this.heart.classList.add('heart__button--float');
           setTimeout(() => this.heart.classList.remove('heart__button--float'), .5);
         }
       })
       .catch(console.error);
   }

   export default ajaxHeart;